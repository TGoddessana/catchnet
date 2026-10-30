"""Phase 0 benchmark: can a headless agent turn an error report into a fix?

Tasks are SWE-bench Lite instances (MIT) whose report carries a traceback,
which is the closest public stand-in for what catchnet sees. For each task
the agent gets the report and a checkout at the buggy commit; grading
applies the upstream test patch on top of the agent's diff and runs the
tests the real fix made pass (FAIL_TO_PASS) and must keep passing
(PASS_TO_PASS).

    python3 bench.py validate            # gold patch must pass, no patch must fail
    python3 bench.py run claude [ids..]  # run an agent, write results/<agent>/
    python3 bench.py report              # results/REPORT.md
"""

import json
import os
import re
import shutil
import subprocess
import sys
import time
from dataclasses import asdict
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parents[1] / "runner"))

from catchnet_runner.agents import AGENTS  # noqa: E402
from catchnet_runner.prompts import fix_prompt  # noqa: E402

TASKS = json.loads((HERE / "data" / "tasks.json").read_text())
WORK = Path(os.environ.get("BENCH_WORK", HERE / ".work"))
RESULTS = HERE / "results"


def sh(cmd, cwd=None, env=None, timeout=1800, check=True):
    proc = subprocess.run(
        cmd,
        cwd=cwd,
        env=env,
        shell=isinstance(cmd, str),
        capture_output=True,
        text=True,
        timeout=timeout,
    )
    if check and proc.returncode != 0:
        raise RuntimeError(f"{cmd}\n{proc.stdout[-2000:]}\n{proc.stderr[-2000:]}")
    return proc


def python_for(task):
    if task["repo"] == "django/django" and not task["version"].startswith("3."):
        return "3.11"
    return "3.9"


def setup_env(task, repo_dir):
    env = dict(os.environ, SETUPTOOLS_SCM_PRETEND_VERSION=task["version"] + ".0")
    sh(["uv", "venv", "-q", "--python", python_for(task), ".venv"], cwd=repo_dir)
    pip = ["uv", "pip", "install", "-q", "--python", ".venv/bin/python"]
    repo = task["repo"]
    if repo == "django/django":
        sh(pip + ["-e", "."], cwd=repo_dir, env=env)
    elif repo == "sympy/sympy":
        sh(pip + ["-e", ".", "mpmath==1.3.0", "pytest<8.4"], cwd=repo_dir, env=env)
    elif repo == "pytest-dev/pytest":
        sh(pip + ["-e", ".", "attrs<22", "hypothesis<6.80"], cwd=repo_dir, env=env)
    elif repo == "pylint-dev/pylint":
        sh(pip + ["-e", ".", "pytest<8", "pytest-timeout"], cwd=repo_dir, env=env)
    (repo_dir / ".git" / "info" / "exclude").write_text(".venv/\n")


def prepare(task, slot):
    repo_dir = WORK / slot / task["instance_id"]
    if repo_dir.exists():
        shutil.rmtree(repo_dir)
    repo_dir.mkdir(parents=True)
    url = f"https://github.com/{task['repo']}.git"
    sh(["git", "init", "-q"], cwd=repo_dir)
    sh(["git", "remote", "add", "origin", url], cwd=repo_dir)
    sh(
        ["git", "fetch", "-q", "--depth", "1", "origin", task["base_commit"]],
        cwd=repo_dir,
    )
    sh(["git", "checkout", "-q", "FETCH_HEAD"], cwd=repo_dir)
    setup_env(task, repo_dir)
    return repo_dir


def test_hint(task):
    repo = task["repo"]
    if repo == "django/django":
        return ".venv/bin/python tests/runtests.py <module.Class.test_name> (run from the repo root)"
    return ".venv/bin/python -m pytest <path/to/test_file.py> -k <name>"


def files_in_patch(patch):
    return re.findall(r"^diff --git a/(\S+) b/", patch, re.M)


DJANGO_TEST = re.compile(r"^(\w+) \(([\w.]+)\)")


def django_label(entry):
    name, path = DJANGO_TEST.match(entry).groups()
    return path if path.endswith("." + name) else f"{path}.{name}"


def run_tests(task, repo_dir, entries):
    if not entries:
        return True, ""
    py = ".venv/bin/python"
    repo = task["repo"]
    if repo == "django/django":
        # Some entries are a test's docstring rather than its name; those
        # cannot be addressed one by one, so run the test patch's modules.
        labels = {django_label(e) for e in entries if DJANGO_TEST.match(e)}
        if any(not DJANGO_TEST.match(e) for e in entries):
            labels |= {
                f[len("tests/") : -len(".py")].replace("/", ".")
                for f in files_in_patch(task["test_patch"])
                if f.startswith("tests/") and f.endswith(".py")
            }
        cmd = [py, "tests/runtests.py", "--parallel", "1", "-v", "1", *sorted(labels)]
    elif repo == "sympy/sympy":
        files = [f for f in files_in_patch(task["test_patch"]) if "/tests/" in f]
        cmd = [py, "-m", "pytest", "-q", "-p", "no:cacheprovider", *files]
        cmd += ["-k", " or ".join(sorted(set(entries)))]
    else:
        cmd = [py, "-m", "pytest", "-q", "-p", "no:cacheprovider", *entries]
    proc = sh(cmd, cwd=repo_dir, check=False, timeout=1200)
    return proc.returncode == 0, (proc.stdout + proc.stderr)[-3000:]


def capture_diff(repo_dir):
    sh(["git", "add", "-A", "-N"], cwd=repo_dir)
    return sh(["git", "diff"], cwd=repo_dir).stdout


def grade(task, repo_dir, agent_diff):
    """Reset to base, apply the agent's diff minus test files the upstream
    test patch owns, apply the test patch, run the target tests."""
    sh(["git", "reset", "-q", "--hard"], cwd=repo_dir)
    sh(["git", "clean", "-qfd"], cwd=repo_dir)
    applied = True
    if agent_diff.strip():
        owned = files_in_patch(task["test_patch"])
        excludes = sum((["--exclude", f] for f in owned), [])
        proc = subprocess.run(
            ["git", "apply", "--whitespace=nowarn", *excludes, "-"],
            cwd=repo_dir,
            input=agent_diff,
            text=True,
            capture_output=True,
        )
        applied = proc.returncode == 0
    subprocess.run(
        ["git", "apply", "-"],
        cwd=repo_dir,
        input=task["test_patch"],
        text=True,
        check=True,
    )
    f2p_ok, f2p_log = run_tests(task, repo_dir, json.loads(task["FAIL_TO_PASS"]))
    p2p_ok, p2p_log = run_tests(task, repo_dir, json.loads(task["PASS_TO_PASS"]))
    return {
        "applied": applied,
        "fail_to_pass": f2p_ok,
        "pass_to_pass": p2p_ok,
        "resolved": applied and f2p_ok and p2p_ok,
        "f2p_log": f2p_log,
        "p2p_log": p2p_log,
    }


def select(ids):
    return [t for t in TASKS if not ids or t["instance_id"] in ids]


def cmd_validate(ids):
    for task in select(ids):
        repo_dir = prepare(task, "validate")
        none = grade(task, repo_dir, "")
        gold = grade(task, repo_dir, task["patch"])
        ok = (not none["fail_to_pass"]) and gold["resolved"]
        print(
            f"{'OK ' if ok else 'BAD'} {task['instance_id']}  no-patch f2p={none['fail_to_pass']}  gold={gold['resolved']} (p2p={gold['pass_to_pass']})",
            flush=True,
        )
        if not ok:
            print(gold["f2p_log"][-1500:], gold["p2p_log"][-1500:], sep="\n")
        shutil.rmtree(repo_dir)


def cmd_run(agent, ids, model=None):
    api_key = (HERE.parents[1] / ".env").read_text().strip()
    out_dir = RESULTS / (agent + (f"-{model}" if model else ""))
    out_dir.mkdir(parents=True, exist_ok=True)
    for task in select(ids):
        out = out_dir / f"{task['instance_id']}.json"
        if out.exists():
            continue
        t0 = time.time()
        repo_dir = prepare(task, agent + (model or ""))
        prompt = fix_prompt(
            repo=task["repo"],
            report=task["problem_statement"],
            test_hint=test_hint(task),
        )
        kwargs = {"model": model} if model else {}
        if agent == "claude":
            kwargs.update(api_key=api_key, max_budget_usd=2.5)
        result = AGENTS[agent](str(repo_dir), prompt, **kwargs)
        diff = capture_diff(repo_dir)
        graded = grade(task, repo_dir, diff)
        record = {
            "instance_id": task["instance_id"],
            "repo": task["repo"],
            "agent": asdict(result),
            "diff": diff,
            "diff_lines": sum(
                1
                for line in diff.splitlines()
                if line[:1] in "+-" and line[:3] not in ("+++", "---")
            ),
            "gold_lines": sum(
                1
                for line in task["patch"].splitlines()
                if line[:1] in "+-" and line[:3] not in ("+++", "---")
            ),
            "touched_gold_files": sorted(
                set(files_in_patch(diff)) & set(files_in_patch(task["patch"]))
            ),
            "grade": graded,
            "wall_s": round(time.time() - t0, 1),
        }
        out.write_text(json.dumps(record, indent=1))
        r = result
        print(
            f"{task['instance_id']}: resolved={graded['resolved']} cost={r.cost_usd} tokens={r.input_tokens}+{r.cached_input_tokens}c/{r.output_tokens} {r.duration_s:.0f}s {r.error}",
            flush=True,
        )
        shutil.rmtree(repo_dir)


def cmd_report():
    lines = ["# Phase 0 results", ""]
    for d in sorted(p for p in RESULTS.iterdir() if p.is_dir()):
        recs = [json.loads(p.read_text()) for p in sorted(d.glob("*.json"))]
        if not recs:
            continue
        solved = sum(r["grade"]["resolved"] for r in recs)
        costs = [
            r["agent"]["cost_usd"] for r in recs if r["agent"]["cost_usd"] is not None
        ]
        secs = [r["agent"]["duration_s"] for r in recs]
        lines += [
            f"## {d.name}",
            "",
            f"- resolved: **{solved}/{len(recs)}**",
            f"- agent time: median {sorted(secs)[len(secs) // 2]:.0f}s, max {max(secs):.0f}s",
        ]
        if costs:
            lines.append(
                f"- cost: total ${sum(costs):.2f}, mean ${sum(costs) / len(costs):.2f}, max ${max(costs):.2f}"
            )
        lines += [
            "",
            "| task | resolved | f2p | p2p | cost | tokens in/cached/out | time | diff/gold lines |",
            "|---|---|---|---|---|---|---|---|",
        ]
        for r in recs:
            a, g = r["agent"], r["grade"]
            cost = f"${a['cost_usd']:.2f}" if a["cost_usd"] is not None else "-"
            lines.append(
                f"| {r['instance_id']} | {'✅' if g['resolved'] else '❌'} | {g['fail_to_pass']} | {g['pass_to_pass']} | {cost} | {a['input_tokens']}/{a['cached_input_tokens']}/{a['output_tokens']} | {a['duration_s']:.0f}s | {r['diff_lines']}/{r['gold_lines']} |"
            )
        lines.append("")
    (RESULTS / "REPORT.md").write_text("\n".join(lines))
    print("\n".join(lines))


if __name__ == "__main__":
    cmd, *rest = sys.argv[1:] or ["report"]
    if cmd == "validate":
        cmd_validate(rest)
    elif cmd == "run":
        agent, *ids = rest
        model = os.environ.get("BENCH_MODEL")
        cmd_run(agent, ids, model)
    else:
        cmd_report()
