"""Headless coding agents the runner can drive.

Each adapter runs one agent CLI non-interactively inside a checkout and
returns what it cost and what it said. The adapters never commit or push;
the caller reads the working tree afterwards.
"""

import json
import os
import subprocess
import time
from dataclasses import dataclass, field


@dataclass
class AgentResult:
    agent: str
    model: str
    ok: bool
    summary: str = ""
    duration_s: float = 0.0
    input_tokens: int = 0
    cached_input_tokens: int = 0
    output_tokens: int = 0
    # None when the agent's own output carries no price (subscription auth).
    cost_usd: float | None = None
    turns: int = 0
    error: str = ""
    raw_tail: str = field(default="", repr=False)


def _base_env(extra: dict[str, str] | None = None) -> dict[str, str]:
    # Start from a small, explicit environment so a runner launched from
    # inside another agent session does not leak that session's variables.
    keep = ("PATH", "HOME", "LANG", "TMPDIR", "USER", "SHELL")
    env = {k: os.environ[k] for k in keep if k in os.environ}
    env.update(extra or {})
    return env


CLAUDE_ALLOWED_TOOLS = [
    "Read",
    "Edit",
    "Write",
    "Glob",
    "Grep",
    "Bash(.venv/bin/python:*)",
    "Bash(git diff:*)",
    "Bash(git status:*)",
    "Bash(git log:*)",
    "Bash(ls:*)",
]

# For customer repositories, whose test command is not known in advance.
CLAUDE_PROJECT_TOOLS = CLAUDE_ALLOWED_TOOLS + [
    f"Bash({cmd}:*)"
    for cmd in (
        "python",
        "python3",
        "pytest",
        "uv run",
        "npm test",
        "npm run test",
        "npx vitest",
        "npx jest",
        "node",
        "go test",
        "cargo test",
        "bundle exec rspec",
        "make test",
        "cat",
        "head",
        "tail",
    )
]


def run_claude(
    workdir: str,
    prompt: str,
    *,
    model: str = "claude-sonnet-5-5",
    api_key: str,
    max_budget_usd: float = 4.0,
    timeout_s: int = 1500,
    system_prompt: str | None = None,
    allowed_tools: list[str] | None = None,
) -> AgentResult:
    cmd = [
        "claude",
        "-p",
        prompt,
        "--bare",
        "--model",
        model,
        "--output-format",
        "json",
        # No blanket permission bypass: file tools plus the project's own
        # interpreter and read-only git, inside Claude Code's OS sandbox.
        # Anything else is denied, since -p cannot ask.
        "--allowedTools",
        *(CLAUDE_ALLOWED_TOOLS if allowed_tools is None else allowed_tools),
        "--settings",
        json.dumps({"sandbox": {"enabled": True, "autoAllowBashIfSandboxed": False}}),
        "--no-session-persistence",
        "--max-budget-usd",
        str(max_budget_usd),
    ]
    if system_prompt:
        cmd += ["--append-system-prompt", system_prompt]
    started = time.monotonic()
    try:
        proc = subprocess.run(
            cmd,
            cwd=workdir,
            env=_base_env({"ANTHROPIC_API_KEY": api_key}),
            capture_output=True,
            text=True,
            timeout=timeout_s,
        )
    except subprocess.TimeoutExpired:
        return AgentResult(
            "claude", model, False, duration_s=timeout_s, error="timeout"
        )
    duration = time.monotonic() - started
    try:
        data = json.loads(proc.stdout)
    except json.JSONDecodeError:
        return AgentResult(
            "claude",
            model,
            False,
            duration_s=duration,
            error=f"exit {proc.returncode}: {proc.stderr[-500:]}",
            raw_tail=proc.stdout[-2000:],
        )
    usage = data.get("usage") or {}
    return AgentResult(
        agent="claude",
        model=model,
        ok=not data.get("is_error", False),
        summary=data.get("result") or "",
        duration_s=duration,
        input_tokens=usage.get("input_tokens", 0)
        + usage.get("cache_creation_input_tokens", 0),
        cached_input_tokens=usage.get("cache_read_input_tokens", 0),
        output_tokens=usage.get("output_tokens", 0),
        cost_usd=data.get("total_cost_usd"),
        turns=data.get("num_turns", 0),
        error=data.get("subtype", "") if data.get("is_error") else "",
    )


def run_codex(
    workdir: str,
    prompt: str,
    *,
    model: str = "gpt-6.1-sol",
    reasoning_effort: str = "high",
    api_key: str | None = None,
    timeout_s: int = 1500,
) -> AgentResult:
    cmd = [
        "codex",
        "exec",
        "--json",
        "--ephemeral",
        "--ignore-user-config",
        "--skip-git-repo-check",
        "-s",
        "workspace-write",
        "-C",
        workdir,
        "-m",
        model,
        "-c",
        f'model_reasoning_effort="{reasoning_effort}"',
        prompt,
    ]
    extra = {"OPENAI_API_KEY": api_key} if api_key else {}
    started = time.monotonic()
    try:
        proc = subprocess.run(
            cmd,
            cwd=workdir,
            env=_base_env(extra),
            capture_output=True,
            text=True,
            timeout=timeout_s,
        )
    except subprocess.TimeoutExpired:
        return AgentResult("codex", model, False, duration_s=timeout_s, error="timeout")
    duration = time.monotonic() - started
    result = AgentResult("codex", model, proc.returncode == 0, duration_s=duration)
    for line in proc.stdout.splitlines():
        try:
            event = json.loads(line)
        except json.JSONDecodeError:
            continue
        kind = event.get("type")
        if kind == "turn.completed":
            usage = event.get("usage") or {}
            result.input_tokens += usage.get("input_tokens", 0)
            result.cached_input_tokens += usage.get("cached_input_tokens", 0)
            result.output_tokens += usage.get("output_tokens", 0)
            result.turns += 1
        elif kind == "item.completed":
            item = event.get("item") or {}
            if item.get("type") == "agent_message":
                result.summary = item.get("text", "")
        elif kind in ("error", "turn.failed"):
            result.ok = False
            result.error = json.dumps(event)[:500]
    if proc.returncode != 0 and not result.error:
        result.error = f"exit {proc.returncode}: {proc.stderr[-500:]}"
    result.raw_tail = proc.stdout[-2000:]
    return result


AGENTS = {"claude": run_claude, "codex": run_codex}
