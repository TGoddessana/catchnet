from datetime import timedelta

from django.db import IntegrityError
from django.db.models import Count, Q, QuerySet, Sum
from django.http import HttpResponse
from django.shortcuts import aget_object_or_404
from django.utils import timezone
from ninja import Field, Query, Router, Schema, Status
from ninja.errors import HttpError

from apps.issue_events.models import Issue
from apps.projects.models import Project
from glitchtip.api.permissions import (
    OrgScopedHttpRequest,
    org_scoped,
    org_scoped_list,
)

from .models import (
    ACTIVE_STATUSES,
    AutofixMode,
    AutofixSettings,
    FixAttempt,
    FixStatus,
    FixTrigger,
)
from .schema import (
    AutofixSettingsIn,
    AutofixSettingsSchema,
    FixAttemptSchema,
    FixUsageSchema,
)

router = Router()


@router.get(
    "projects/{slug:organization_id_or_slug}/{slug:project_slug}/autofix/",
    response=AutofixSettingsSchema,
    by_alias=True,
)
@org_scoped(["project:read", "project:write", "project:admin"], Project)
async def get_autofix_settings(
    request: OrgScopedHttpRequest,
    qs: QuerySet[Project],
    organization_id_or_slug: str,
    project_slug: str,
):
    project = await aget_object_or_404(
        qs.only("id", "organization_id"), slug=project_slug
    )
    existing = await AutofixSettings.objects.filter(project=project).afirst()
    return existing or AutofixSettings(project=project)


@router.put(
    "projects/{slug:organization_id_or_slug}/{slug:project_slug}/autofix/",
    response=AutofixSettingsSchema,
    by_alias=True,
)
@org_scoped(["project:write", "project:admin"], Project)
async def update_autofix_settings(
    request: OrgScopedHttpRequest,
    qs: QuerySet[Project],
    organization_id_or_slug: str,
    project_slug: str,
    payload: AutofixSettingsIn,
):
    project = await aget_object_or_404(
        qs.only("id", "organization_id"), slug=project_slug
    )
    if payload.mode != AutofixMode.OFF and not payload.repository:
        raise HttpError(400, "Connect a repository before turning autofix on.")
    current = await AutofixSettings.objects.filter(project=project).afirst()
    auto_since = current.auto_since if current else None
    if payload.mode == AutofixMode.AUTO and (
        not current or current.mode != AutofixMode.AUTO
    ):
        auto_since = timezone.now()
    obj, _ = await AutofixSettings.objects.aupdate_or_create(
        project=project,
        defaults={
            **payload.dict(),
            "organization_id": project.organization_id,
            "auto_since": auto_since,
        },
    )
    return obj


@router.get(
    "organizations/{slug:organization_id_or_slug}/issues/{int:issue_id}/fixes/",
    response=list[FixAttemptSchema],
    by_alias=True,
)
@org_scoped_list(["event:read", "event:write", "event:admin"], FixAttempt)
async def list_issue_fixes(
    request: OrgScopedHttpRequest,
    response: HttpResponse,
    organization_id_or_slug: str,
    issue_id: int,
):
    return (
        FixAttempt.objects.filter(issue_id=issue_id)
        .select_related("issue__project")
        .order_by("-created")
    )


@router.post(
    "organizations/{slug:organization_id_or_slug}/issues/{int:issue_id}/fixes/",
    response={201: FixAttemptSchema},
    by_alias=True,
)
@org_scoped(["event:write", "event:admin"], Issue)
async def request_issue_fix(
    request: OrgScopedHttpRequest,
    qs: QuerySet[Issue],
    organization_id_or_slug: str,
    issue_id: int,
):
    issue = await aget_object_or_404(qs.select_related("project"), id=issue_id)
    config = await AutofixSettings.objects.filter(project_id=issue.project_id).afirst()
    if not config or not config.is_ready:
        raise HttpError(400, "Autofix is not set up for this project.")
    in_progress = "A fix is already in progress for this issue."
    if await FixAttempt.objects.filter(
        issue_id=issue.id, status__in=ACTIVE_STATUSES
    ).aexists():
        raise HttpError(409, in_progress)
    try:
        attempt = await FixAttempt.objects.acreate(
            organization_id=issue.project.organization_id,
            project_id=issue.project_id,
            issue=issue,
            requested_by_id=request.auth.user_id,
            trigger=FixTrigger.MANUAL,
            agent=config.agent,
            repository=config.repository,
        )
    except IntegrityError:  # lost a race with another request
        raise HttpError(409, in_progress)
    return Status(201, attempt)


class FixListFilters(Schema):
    # Comma-separated issue ids.
    issue: str = Field("", pattern=r"^[0-9,]*$", max_length=2000)
    project: int | None = None


@router.get(
    "organizations/{slug:organization_id_or_slug}/fixes/",
    response=list[FixAttemptSchema],
    by_alias=True,
)
@org_scoped_list(["event:read", "event:write", "event:admin"], FixAttempt)
async def list_fixes(
    request: OrgScopedHttpRequest,
    response: HttpResponse,
    organization_id_or_slug: str,
    filters: Query[FixListFilters],
):
    """Recent fix runs. With ``issue`` ids, only the newest run per issue,
    which is what the issue list's status badges need."""
    qs = FixAttempt.objects.select_related("issue__project").order_by("-created")
    if filters.project:
        qs = qs.filter(project_id=filters.project)
    issue_ids = [int(i) for i in filters.issue.split(",") if i][:100]
    if issue_ids:
        qs = (
            qs.filter(issue_id__in=issue_ids)
            .order_by("issue_id", "-created")
            .distinct("issue_id")
        )
    return qs


@router.get(
    "organizations/{slug:organization_id_or_slug}/fixes/usage/",
    response=FixUsageSchema,
    by_alias=True,
)
@org_scoped(["org:read", "org:write", "org:admin"], FixAttempt)
async def get_fix_usage(
    request: OrgScopedHttpRequest,
    qs: QuerySet[FixAttempt],
    organization_id_or_slug: str,
    days: int = 30,
):
    since = timezone.now() - timedelta(days=max(1, min(days, 366)))
    totals = await qs.filter(created__gte=since).aaggregate(
        attempts=Count("id"),
        prs_opened=Count(
            "id",
            filter=Q(
                status__in=[FixStatus.PR_OPENED, FixStatus.MERGED, FixStatus.CLOSED]
            ),
        ),
        merged=Count("id", filter=Q(status=FixStatus.MERGED)),
        no_fix=Count("id", filter=Q(status=FixStatus.NO_FIX)),
        failed=Count("id", filter=Q(status=FixStatus.FAILED)),
        cost_usd=Sum("cost_usd"),
        input_tokens=Sum("input_tokens"),
        output_tokens=Sum("output_tokens"),
    )
    return {
        "since": since,
        **{k: v or 0 for k, v in totals.items()},
    }
