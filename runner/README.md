# catchnet runner

The process that turns an error into a pull request. The backend queues a
fix (someone pressed **Write a fix**, or a project is in automatic mode); the
runner claims it, then:

1. **Triage**: a small model reads the error report and decides whether a
   code change in the repository could fix it. Timeouts from other services,
   third-party crashes and noise stop here, cheaply.
2. **Fix**: clones the repository, installs its dependencies, and runs a
   headless coding agent (Claude Code or Codex) on the report. The agent
   writes the fix and a regression test and runs the tests.
3. **Guard**: drops changes to CI config, lock files and secrets, and
   refuses diffs over 400 lines.
4. **Pull request**: pushes `catchnet/fix-<issue>-<run>` and opens a draft
   pull request. It never merges.
5. **CI**: waits for the pull request's checks. On a failure it gives the
   log to the agent and pushes a follow-up commit, up to two times.
6. **Merge**: notices when a fix PR is merged and marks the issue resolved.

The backend never sees the GitHub token or the model API key; both live
only here.

## Running it

```sh
cd runner
uv sync
CATCHNET_URL=http://localhost:8000 \
CATCHNET_RUNNER_TOKEN=<same value as the backend's> \
ANTHROPIC_API_KEY=... \
GITHUB_TOKEN=... \
uv run python -m catchnet_runner
```

Set the same `CATCHNET_RUNNER_TOKEN` on the backend (for the dev stack, in
`backend/compose.override.yml`). `GITHUB_TOKEN` needs contents and pull
request write access to the repositories projects connect to. Codex uses
`OPENAI_API_KEY` if set, otherwise its own login. `python -m catchnet_runner --once`
drains the queue and exits.

## Isolation

The agent edits a fresh checkout under its CLI's own sandbox, with an
allowlist of tools rather than blanket permissions. That is enough for a
developer machine and trusted repositories. A shared or hosted runner must
also run each job in a throwaway container or VM: the agent runs the
repository's tests, which is running the repository's code.
