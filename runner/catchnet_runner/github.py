"""The few GitHub REST calls the runner needs."""

import io
import zipfile

import httpx

API = "https://api.github.com"


class GitHub:
    def __init__(self, token: str):
        self.token = token
        self.http = httpx.Client(
            base_url=API,
            headers={
                "Authorization": f"Bearer {token}",
                "Accept": "application/vnd.github+json",
                "X-GitHub-Api-Version": "2022-11-28",
            },
            timeout=30,
            follow_redirects=True,
        )

    def clone_url(self, repo: str) -> str:
        return f"https://x-access-token:{self.token}@github.com/{repo}.git"

    def open_pr(self, repo, *, head, base, title, body) -> dict:
        payload = {
            "head": head,
            "base": base,
            "title": title,
            "body": body,
            "draft": True,
        }
        res = self.http.post(f"/repos/{repo}/pulls", json=payload)
        if res.status_code == 422 and "draft" in res.text.lower():
            # Draft PRs need a paid plan on private repositories.
            payload.update(draft=False, title=f"[draft] {title}")
            res = self.http.post(f"/repos/{repo}/pulls", json=payload)
        res.raise_for_status()
        return res.json()

    def pr_state(self, repo, number) -> str:
        """open, merged or closed."""
        res = self.http.get(f"/repos/{repo}/pulls/{number}")
        res.raise_for_status()
        pr = res.json()
        if pr.get("merged"):
            return "merged"
        return pr["state"]

    def check_runs(self, repo, sha) -> list[dict]:
        res = self.http.get(
            f"/repos/{repo}/commits/{sha}/check-runs", params={"per_page": 100}
        )
        res.raise_for_status()
        return res.json().get("check_runs", [])

    def failure_log(self, repo, run: dict, max_lines=150) -> str:
        """The tail of a failed check's log, for the agent to read."""
        text = ""
        output = run.get("output") or {}
        for key in ("title", "summary", "text"):
            if output.get(key):
                text += output[key] + "\n"
        # Check runs created by GitHub Actions share their id with the job.
        if (run.get("app") or {}).get("slug") == "github-actions":
            res = self.http.get(f"/repos/{repo}/actions/jobs/{run['id']}/logs")
            if res.status_code == 200:
                body = res.content
                if body[:2] == b"PK":
                    with zipfile.ZipFile(io.BytesIO(body)) as zf:
                        body = b"\n".join(zf.read(n) for n in zf.namelist())
                text += body.decode(errors="replace")
        lines = text.splitlines()
        return "\n".join(lines[-max_lines:])
