"""Endpoints the autofix runner calls.

The runner is a separate process (``runner/`` at the repository root) that
holds the GitHub credential and the model API key; the backend holds
neither. It authenticates with a shared secret, ``CATCHNET_RUNNER_TOKEN``,
and acts across organizations, so these routes bypass the org gate. With
the setting empty, every route answers 401.
"""

import hmac
from datetime import timedelta

from asgiref.sync import sync_to_async
from django.conf import settings
from django.db import transaction
from django.db.models import F
from django.http import HttpRequest
from django.shortcuts import aget_object_or_404
from django.utils import timezone
from ninja import Router, Status
from ninja.security import HttpBearer

from apps.issue_events.constants import EventStatus
from apps.issue_events.models import Issue, IssueIndex

from .models import (
    TERMINAL_STATUSES,
    AutofixSettings,
    FixAttempt,
    FixStatus,
)
from .report import build_report
from .schema import RunnerJobSchema, RunnerOpenPRSchema, RunnerUpdateIn

# A run that has not reported for this long is presumed dead: its runner
# crashed or was killed, and the issue should be free for a new attempt.
STALE_AFTER = timedelta(minutes=45)


class RunnerAuth(HttpBearer):
    async def authenticate(self, request: HttpRequest, token: str):
        expected = settings.CATCHNET_RUNNER_TOKEN
        if expected and hmac.compare_digest(token.encode(), expected.encode()):
            return "runner"
        return None


# Responses keep snake_case field names: the runner is a Python client.
router = Router(auth=RunnerAuth())


def _claim(runner_id: str) -> FixAttempt | None:
    with transaction.atomic():
        attempt = (
            FixAttempt.objects.select_for_update(skip_locked=True)
            .filter(status=FixStatus.QUEUED)
            .order_by("created")
            .first()
        )
        if attempt is None:
            return None
        attempt.status = FixStatus.TRIAGING
        attempt.started_at = timezone.now()
        attempt.runner_id = runner_id[:64]
        attempt.save(update_fields=["status", "started_at", "runner_id", "updated"])
        return attempt


async def expire_stale_attempts() -> int:
    return await FixAttempt.objects.filter(
        status__in=[FixStatus.TRIAGING, FixStatus.RUNNING],
        updated__lt=timezone.now() - STALE_AFTER,
    ).aupdate(
        status=FixStatus.FAILED,
        failure_reason="The runner stopped reporting.",
        finished_at=timezone.now(),
    )


@router.post("autofix/runner/claim/", response={200: RunnerJobSchema, 204: None})
async def claim_job(request: HttpRequest, runner: str = "runner"):
    await expire_stale_attempts()
    attempt = await sync_to_async(_claim)(runner)
    if attempt is None:
        return Status(204, None)
    issue = await Issue.objects.select_related("project__organization", "index").aget(
        id=attempt.issue_id
    )
    config = await AutofixSettings.objects.filter(
        project_id=attempt.project_id
    ).afirst()
    code_root = config.code_root if config else ""
    return {
        "id": attempt.id,
        "issue_id": issue.id,
        "short_id": issue.short_id_display,
        "issue_url": issue.get_detail_url(),
        "title": issue.title,
        "repository": attempt.repository,
        "default_branch": config.default_branch if config else "main",
        "agent": attempt.agent,
        "code_root": code_root,
        "triage": True,
        "report": await build_report(issue, code_root),
    }


@router.patch("autofix/runner/attempts/{int:attempt_id}/", response={204: None})
async def update_attempt(
    request: HttpRequest, attempt_id: int, payload: RunnerUpdateIn
):
    attempt = await aget_object_or_404(FixAttempt, id=attempt_id)
    fields = payload.dict(exclude_unset=True, exclude_none=True)
    updates = {k: v for k, v in fields.items() if not k.startswith("add_")}
    updates["input_tokens"] = F("input_tokens") + payload.add_input_tokens
    updates["cached_input_tokens"] = (
        F("cached_input_tokens") + payload.add_cached_input_tokens
    )
    updates["output_tokens"] = F("output_tokens") + payload.add_output_tokens
    updates["duration_s"] = F("duration_s") + payload.add_duration_s
    if payload.add_cost_usd:
        current = attempt.cost_usd or 0
        updates["cost_usd"] = current + payload.add_cost_usd
    if payload.status in TERMINAL_STATUSES and attempt.finished_at is None:
        updates["finished_at"] = timezone.now()
    updates["updated"] = timezone.now()
    await FixAttempt.objects.filter(id=attempt_id).aupdate(**updates)
    if payload.status == FixStatus.MERGED:
        # The fix shipped to the default branch; the issue reopens on its own
        # if the error comes back (regression handling at ingest).
        await IssueIndex.objects.filter(
            issue_id=attempt.issue_id, organization_id=attempt.organization_id
        ).aupdate(status=EventStatus.RESOLVED)
    return Status(204, None)


@router.get("autofix/runner/open-prs/", response=list[RunnerOpenPRSchema])
async def list_open_prs(request: HttpRequest):
    """Fix PRs still open, so the runner can notice merges and closes."""
    return [
        a
        async for a in FixAttempt.objects.filter(
            status=FixStatus.PR_OPENED, pr_number__isnull=False
        ).only("id", "repository", "pr_number")[:200]
    ]
