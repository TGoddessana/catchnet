"""One fix run: triage, fix, guard, open the PR, follow CI."""

import json
import logging
import re
import shutil
import subprocess
import tempfile
import time
from dataclasses import dataclass
from pathlib import Path

from .agents import CLAUDE_PROJECT_TOOLS, AgentResult, run_claude, run_codex
from .catchnet import Catchnet
from .github import GitHub
from .prompts import (
    PROJECT_TEST_HINT,
    ci_fix_prompt,
    fix_prompt,
    triage_prompt,
)

log = logging.getLogger("catchnet.runner")

# Paths an autofix must never change. A fix that only touches these is
# dropped; one that touches them among other files has them reverted.
PROTECTED = re.compile(
    r"(^|/)(\.github/|\.gitlab-ci|\.circleci/|\.env|Dockerfile$)"
    r"|(^|/)(package-lock\.json|yarn\.lock|pnpm-lock\.yaml|poetry\.lock|uv\.lock"
    r"|Pipfile\.lock|Cargo\.lock|go\.sum|Gemfile\.lock|composer\.lock)$"
)
MAX_DIFF_LINES = 400
CI_WAIT_S = 15 * 60
CI_POLL_S = 20
MAX_CI_ROUNDS = 2


@dataclass
class Settings:
    anthropic_api_key: str
    claude_model: str = "claude-sonnet-5-5"
    triage_model: str = "claude-haiku-5-5"
    codex_model: str = "gpt-6.1-sol"
    openai_api_key: str | None = None
    work_dir: str | None = None
    max_run_usd: float = 3.0
    follow_ci: bool = True


def git(*args, cwd, check=True) -> str:
    proc = subprocess.run(["git", *args], cwd=cwd, capture_output=True, text=True)
    if check and proc.returncode != 0:
        raise RuntimeError(f"git {args[0]} failed: {proc.stderr.strip()[-500:]}")
    return proc.stdout


def prepare_dependencies(workdir: Path) -> None:
    """Install the project's dependencies before the agent starts.

    The agent runs in a sandbox without network access, so it can run the
    tests only if their dependencies are already in place. Best effort: a
    project we cannot prepare still gets a fix, just a less tested one.
    """
    (workdir / ".git" / "info" / "exclude").write_text(".venv/\nnode_modules/\n")
    if (workdir / "pyproject.toml").exists() and shutil.which("uv"):
        cmd = ["uv", "sync", "--all-groups", "--quiet"]
    elif (workdir / "requirements.txt").exists() and shutil.which("uv"):
        subprocess.run(["uv", "venv", "-q", ".venv"], cwd=workdir, capture_output=True)
        cmd = [
            "uv",
            "pip",
            "install",
            "-q",
            "--python",
            ".venv/bin/python",
            "-r",
            "requirements.txt",
        ]
    elif (workdir / "package-lock.json").exists() and shutil.which("npm"):
        cmd = ["npm", "ci", "--ignore-scripts", "--no-audit", "--no-fund"]
    else:
        return
    try:
        proc = subprocess.run(
            cmd, cwd=workdir, capture_output=True, text=True, timeout=600
        )
        if proc.returncode != 0:
            log.warning("dependency install failed: %s", proc.stderr[-500:])
    except subprocess.TimeoutExpired:
        log.warning("dependency install timed out")


def parse_summary(text: str) -> dict:
    fields = {}
    for key in ("ROOT CAUSE", "FIX", "TEST", "CONFIDENCE"):
        m = re.search(rf"^{key}:\s*(.+?)(?=^\w[\w ]*:|\Z)", text, re.M | re.S)
        if m:
            fields[key] = m.group(1).strip()
    conf = fields.get("CONFIDENCE", "").lower().split()
    fields["confidence"] = (
        conf[0] if conf and conf[0] in ("high", "medium", "low") else ""
    )
    return fields


def usage_fields(result: AgentResult) -> dict:
    return {
        "addInputTokens": result.input_tokens,
        "addCachedInputTokens": result.cached_input_tokens,
        "addOutputTokens": result.output_tokens,
        "addCostUsd": f"{result.cost_usd or 0:.4f}",
        "addDurationS": int(result.duration_s),
    }


class Worker:
    def __init__(self, catchnet: Catchnet, github: GitHub, settings: Settings):
        self.catchnet = catchnet
        self.github = github
        self.settings = settings

    # --- agents --------------------------------------------------------

    def agent(self, name: str, workdir: str, prompt: str) -> AgentResult:
        s = self.settings
        if name == "codex":
            return run_codex(
                workdir, prompt, model=s.codex_model, api_key=s.openai_api_key
            )
        return run_claude(
            workdir,
            prompt,
            model=s.claude_model,
            api_key=s.anthropic_api_key,
            max_budget_usd=s.max_run_usd,
            allowed_tools=CLAUDE_PROJECT_TOOLS,
        )

    def triage(self, job: dict) -> tuple[dict, AgentResult]:
        with tempfile.TemporaryDirectory() as empty:
            result = run_claude(
                empty,
                triage_prompt(repo=job["repository"], report=job["report"]),
                model=self.settings.triage_model,
                api_key=self.settings.anthropic_api_key,
                max_budget_usd=0.3,
                allowed_tools=[],
                timeout_s=180,
            )
        m = re.search(r"\{.*\}", result.summary, re.S)
        try:
            verdict = json.loads(m.group(0)) if m else {}
        except json.JSONDecodeError:
            verdict = {}
        if "actionable" not in verdict:
            # An unreadable verdict should not block a fix the user asked for.
            verdict = {
                "actionable": True,
                "category": "unclear",
                "reason": "Triage gave no verdict.",
            }
        return verdict, result

    # --- the run -------------------------------------------------------

    def handle(self, job: dict) -> None:
        attempt = job["id"]
        try:
            self._handle(job)
        except Exception as exc:  # report, then keep the runner alive
            log.exception("attempt %s failed", attempt)
            self.catchnet.update(
                attempt, status="failed", failureReason=str(exc)[:2000]
            )

    def _handle(self, job: dict) -> None:
        attempt = job["id"]
        if job.get("triage"):
            verdict, result = self.triage(job)
            self.catchnet.update(
                attempt,
                triage=verdict,
                model=self.settings.triage_model,
                **usage_fields(result),
            )
            if not verdict.get("actionable"):
                self.catchnet.update(
                    attempt,
                    status="no_fix",
                    failureReason=f"Triage: {verdict.get('reason', '')}",
                )
                return

        model = (
            self.settings.codex_model
            if job["agent"] == "codex"
            else self.settings.claude_model
        )
        self.catchnet.update(attempt, status="running", model=model)
        root = Path(
            tempfile.mkdtemp(prefix=f"fix-{attempt}-", dir=self.settings.work_dir)
        )
        try:
            self._fix(job, root / "repo", model)
        finally:
            shutil.rmtree(root, ignore_errors=True)

    def _fix(self, job: dict, workdir: Path, model: str) -> None:
        attempt, repo, base = job["id"], job["repository"], job["default_branch"]
        git(
            "clone",
            "-q",
            "--depth",
            "50",
            "--branch",
            base,
            self.github.clone_url(repo),
            str(workdir),
            cwd=workdir.parent,
        )
        branch = f"catchnet/fix-{job['short_id'].lower() or job['issue_id']}-{attempt}"
        git("checkout", "-q", "-b", branch, cwd=workdir)
        git("config", "user.name", "catchnet autofix", cwd=workdir)
        git("config", "user.email", "autofix@users.noreply.github.com", cwd=workdir)
        prepare_dependencies(workdir)

        prompt = fix_prompt(
            repo=repo, report=job["report"], test_hint=PROJECT_TEST_HINT
        )
        result = self.agent(job["agent"], str(workdir), prompt)
        summary = parse_summary(result.summary)
        self.catchnet.update(
            attempt,
            summary=result.summary[:20000],
            confidence=summary["confidence"],
            **usage_fields(result),
        )
        if not result.ok and not self._changed(workdir):
            raise RuntimeError(f"Agent did not finish: {result.error or 'no output'}")

        problem = self._guard(workdir)
        if problem:
            self.catchnet.update(attempt, status="no_fix", failureReason=problem)
            return

        title = f"fix: {job['title'][:90]} ({job['short_id']})"
        git("add", "-A", cwd=workdir)
        git(
            "commit",
            "-q",
            "-m",
            f"{title}\n\nAutofix for {job['issue_url']}",
            cwd=workdir,
        )
        git("push", "-q", "origin", branch, cwd=workdir)
        pr = self.github.open_pr(
            repo,
            head=branch,
            base=base,
            title=title,
            body=self._pr_body(job, summary, result, model),
        )
        self.catchnet.update(
            attempt,
            status="pr_opened",
            branch=branch,
            prUrl=pr["html_url"],
            prNumber=pr["number"],
            ciStatus="pending" if self.settings.follow_ci else "",
        )
        if self.settings.follow_ci:
            self._follow_ci(job, workdir, branch)

    def _changed(self, workdir: Path) -> bool:
        return bool(git("status", "--porcelain", cwd=workdir).strip())

    def _guard(self, workdir: Path) -> str:
        """Return why the change cannot ship, or "" when it can."""
        git("add", "-A", "-N", cwd=workdir)
        names = [n for n in git("diff", "--name-only", cwd=workdir).splitlines() if n]
        if not names:
            return "The agent did not change any files."
        protected = [n for n in names if PROTECTED.search(n)]
        for name in protected:
            git("checkout", "--", name, cwd=workdir, check=False)
            git("rm", "-q", "--cached", "--force", name, cwd=workdir, check=False)
        if protected and len(protected) == len(names):
            return "The change only touched protected files (CI, lock files, secrets)."
        diff = git("diff", cwd=workdir)
        lines = sum(
            1
            for line in diff.splitlines()
            if line[:1] in "+-" and line[:3] not in ("+++", "---")
        )
        if lines > MAX_DIFF_LINES:
            return f"The change is {lines} lines, over the {MAX_DIFF_LINES}-line limit for an autofix."
        return ""

    def _follow_ci(self, job: dict, workdir: Path, branch: str) -> None:
        attempt, repo = job["id"], job["repository"]
        for round_no in range(MAX_CI_ROUNDS + 1):
            sha = git("rev-parse", "HEAD", cwd=workdir).strip()
            state, failed = self._wait_for_checks(repo, sha)
            if state != "failed":
                self.catchnet.update(attempt, ciStatus=state, ciIterations=round_no)
                return
            if round_no == MAX_CI_ROUNDS:
                break
            log_text = self.github.failure_log(repo, failed)
            result = self.agent(
                job["agent"],
                str(workdir),
                ci_fix_prompt(check=failed["name"], log=log_text),
            )
            self.catchnet.update(
                attempt, summary=result.summary[:20000] or None, **usage_fields(result)
            )
            if self._guard(workdir) or not self._changed(workdir):
                break
            git("add", "-A", cwd=workdir)
            git(
                "commit",
                "-q",
                "-m",
                f"fix: address CI failure in {failed['name']}",
                cwd=workdir,
            )
            git("push", "-q", "origin", branch, cwd=workdir)
        self.catchnet.update(attempt, ciStatus="failed", ciIterations=MAX_CI_ROUNDS)

    def _wait_for_checks(self, repo: str, sha: str) -> tuple[str, dict | None]:
        """ "passed", "failed" (with the failing run), or "" when the repository
        has no checks or they do not finish in time."""
        deadline = time.monotonic() + CI_WAIT_S
        seen_any = False
        while time.monotonic() < deadline:
            runs = self.github.check_runs(repo, sha)
            seen_any = seen_any or bool(runs)
            failed = [
                r for r in runs if r.get("conclusion") in ("failure", "timed_out")
            ]
            if failed:
                return "failed", failed[0]
            if runs and all(r.get("status") == "completed" for r in runs):
                return "passed", None
            if not runs and time.monotonic() > deadline - CI_WAIT_S + 120:
                return "", None  # nothing started within two minutes: no CI
            time.sleep(CI_POLL_S)
        return ("pending" if seen_any else ""), None

    def _pr_body(self, job, summary, result: AgentResult, model: str) -> str:
        def section(title, key):
            return f"### {title}\n{summary[key]}\n" if summary.get(key) else ""

        return "\n".join(
            [
                f"Fixes **[{job['short_id']}]({job['issue_url']})**: {job['title']}",
                "",
                section("Root cause", "ROOT CAUSE"),
                section("Fix", "FIX"),
                section("Test", "TEST"),
                f"**Confidence:** {summary['confidence'] or 'not stated'}",
                "",
                "---",
                f"🤖 Written by catchnet autofix ({job['agent']} · {model}) from the error report. "
                "No human has reviewed it yet. Review before merging.",
            ]
        )

    # --- PR follow-up ----------------------------------------------------

    def sync_prs(self) -> None:
        for pr in self.catchnet.open_prs():
            try:
                state = self.github.pr_state(pr["repository"], pr["pr_number"])
            except Exception:
                log.warning(
                    "could not read PR %s#%s", pr["repository"], pr["pr_number"]
                )
                continue
            if state in ("merged", "closed"):
                self.catchnet.update(pr["id"], status=state)
