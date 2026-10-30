"""Run the autofix runner: python -m catchnet_runner

Environment:
  CATCHNET_URL            backend base URL, e.g. http://localhost:8000
  CATCHNET_RUNNER_TOKEN   the same secret the backend has
  ANTHROPIC_API_KEY       for Claude Code and triage
  GITHUB_TOKEN            push and pull-request access to the configured repos
  OPENAI_API_KEY          optional, for Codex (else Codex's own login)
  CATCHNET_CLAUDE_MODEL   default claude-sonnet-5-5
  CATCHNET_WORK_DIR       where checkouts go (default: system temp)
  CATCHNET_FOLLOW_CI      "0" to skip waiting on the PR's checks
"""

import logging
import os
import socket
import sys
import time

from .catchnet import Catchnet
from .github import GitHub
from .worker import Settings, Worker

POLL_S = 5
PR_SYNC_S = 60


def main() -> None:
    logging.basicConfig(
        level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s"
    )
    log = logging.getLogger("catchnet.runner")
    env = os.environ
    catchnet = Catchnet(
        env["CATCHNET_URL"],
        env["CATCHNET_RUNNER_TOKEN"],
        f"{socket.gethostname()}:{os.getpid()}",
    )
    settings = Settings(
        anthropic_api_key=env["ANTHROPIC_API_KEY"],
        claude_model=env.get("CATCHNET_CLAUDE_MODEL", "claude-sonnet-5-5"),
        openai_api_key=env.get("OPENAI_API_KEY") or None,
        work_dir=env.get("CATCHNET_WORK_DIR") or None,
        follow_ci=env.get("CATCHNET_FOLLOW_CI", "1") != "0",
    )
    worker = Worker(catchnet, GitHub(env["GITHUB_TOKEN"]), settings)
    once = "--once" in sys.argv
    last_sync = 0.0
    log.info("runner %s polling %s", catchnet.runner_id, env["CATCHNET_URL"])
    while True:
        try:
            if time.monotonic() - last_sync > PR_SYNC_S:
                worker.sync_prs()
                last_sync = time.monotonic()
            job = catchnet.claim()
        except Exception:
            log.exception("could not reach catchnet")
            job = None
        if job:
            log.info("attempt %s: %s %s", job["id"], job["short_id"], job["title"])
            worker.handle(job)
            continue
        if once:
            return
        time.sleep(POLL_S)


if __name__ == "__main__":
    main()
