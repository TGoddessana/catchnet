"""Client for the backend's runner endpoints (apps/autofix/runner_api.py)."""

import re

import httpx


def snake(data: dict) -> dict:
    return {re.sub(r"(?<!^)([A-Z])", r"_\1", k).lower(): v for k, v in data.items()}


class Catchnet:
    def __init__(self, url: str, token: str, runner_id: str):
        self.runner_id = runner_id
        self.http = httpx.Client(
            base_url=url.rstrip("/") + "/api/0/autofix/runner/",
            headers={"Authorization": f"Bearer {token}"},
            timeout=60,
        )

    def claim(self) -> dict | None:
        res = self.http.post("claim/", params={"runner": self.runner_id})
        if res.status_code == 204:
            return None
        res.raise_for_status()
        return snake(res.json())

    def update(self, attempt_id: int, **fields) -> None:
        res = self.http.patch(f"attempts/{attempt_id}/", json=fields)
        res.raise_for_status()

    def open_prs(self) -> list[dict]:
        res = self.http.get("open-prs/")
        res.raise_for_status()
        return [snake(pr) for pr in res.json()]
