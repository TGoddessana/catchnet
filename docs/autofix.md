# catchnet autofix

An error reaches catchnet; catchnet opens a pull request that fixes it. The
user reviews and merges it (or has their own AI do so). This document covers
what is built (phases 0–2) and what was measured.

## How it works

```
SDK error ─▶ backend (issue) ─▶ FixAttempt queued ─▶ runner claims it
                 ▲   manual: "Write a fix" button          │
                 │   auto: scheduled task, per-project rules
                 │                                         ▼
     status, PR, cost ◀──────────── triage (Haiku) ─▶ no_fix
                                       │
                                       ▼
                   clone, install deps, agent (Claude Code / Codex)
                                       │  guard: no CI/lockfile/secrets edits, ≤400 lines
                                       ▼
                   push branch, open draft PR ─▶ wait for CI ─▶ on failure,
                                                  feed log back (≤2 rounds)
                                       ▼
                   PR merged ─▶ issue resolved
```

| Piece | Where | Holds |
| --- | --- | --- |
| Settings, fix runs, API, auto-queue task | `backend/apps/autofix/` | No secrets |
| Runner (triage, agent, git, GitHub, CI loop) | `runner/` | GitHub token, model API keys |
| Issue panel, list badges, project settings, Fixes page | `frontend/src/app/…` | — |
| Benchmark | `tools/autofix-bench/` | — |

The backend and runner talk over four endpoints under
`/api/0/autofix/runner/` with a shared secret (`CATCHNET_RUNNER_TOKEN`).
The runner holds its own keys, and several runners can serve one backend.

### States a fix goes through

`queued → triaging → running → pr_opened → merged | closed`, or
`no_fix` (triage said "not a code bug", or the agent changed nothing) or
`failed` (the run broke; a run silent for 45 minutes is failed
automatically). One active run per issue.

### Project settings

When to fix: off / when someone asks / automatically. Automatic mode only
picks up errors first seen after it was switched on, at level error or
above, seen at least *N* times, at most *M* runs a day.

## Phase 0: does it work, and what does it cost?

Twelve SWE-bench Lite tasks (Django ×6, SymPy ×5, pytest ×1) whose issue
text carries a traceback, the closest public stand-in for an error-tracker
report. The agent gets only the report and the checkout; grading applies
the upstream test patch and runs the tests the real fix made pass, plus the
ones it must not break. Every task was checked first: the upstream patch
passes, no patch fails.

| Agent · model | Resolved | Mean cost / task | Median time | Median tokens (in+out) |
|---|---|---|---|---|
| Claude Code · Haiku 5.5 | 11/12 | $0.235 | 65s | 19,548 |
| Claude Code · Opus 5.5 | 11/12 | $0.113 | 54s | 10,273 |
| Claude Code · Sonnet 5.5 | 11/12 | $0.033 | 29s | 6,068 |
| Codex · gpt-6.1-sol | 11/12 | — (subscription) | 62s | 200,582 |

Caveats:

- SWE-bench Lite is public and old, so models have likely seen these fixes.
  Treat the resolve rates as an upper bound. The cost and time are
  realistic.
- Costs are what Claude Code reports per run. Haiku coming out costlier than
  Sonnet comes from Haiku taking many more turns and tokens. Check this
  against the Anthropic console.
- Codex ran on a ChatGPT login, so there is no dollar figure, only tokens.
  Its token count includes cached input; Claude Code's excludes cache reads,
  so the token column is not comparable across agents.
- `django-15202` (URLField raising ValueError instead of ValidationError)
  defeated every agent: each fixed the symptom differently from upstream.

### End to end on a real repository

A private sandbox repository (a tiny shop with planted bugs and GitHub
Actions CI) was connected to a local catchnet:

| Issue | How started | Result | Cost |
| --- | --- | --- | --- |
| `KeyError: 'welcome10'` (coupon case) | Button | Draft PR #1, CI passed | $0.061 |
| `ZeroDivisionError` (empty cart) | Automatic | Draft PR #2, CI passed | $0.054 |
| `TimeoutError` from a partner API | Button | No fix (triage: external service) | $0.022 |
| `ValueError` in code not in this repo | Button | No fix (agent found nothing to change) | $0.035 |

## What is not done or not verified

- The CI-failure loop (agent fixes a red CI) is written but has not been
  exercised: both sandbox PRs went green on the first try.
- Merge detection is covered by a backend test, not by merging a real PR.
- Runs share the host; the agent is limited by its CLI's sandbox and a tool
  allowlist only. A shared runner must run each job in a throwaway
  container or microVM.
- GitHub access is a personal token held by the runner. A shared runner
  needs a GitHub App (per-repository, short-lived installation tokens).
- One repository per project, GitHub only.
