from datetime import timedelta

from django.db import IntegrityError
from django.db.models import Exists, OuterRef
from django.tasks import task
from django.utils import timezone

from apps.issue_events.constants import EventStatus, LogLevel
from apps.issue_events.models import Issue

from .models import AutofixMode, AutofixSettings, FixAttempt, FixTrigger
from .runner_api import expire_stale_attempts


async def queue_for_project(config: AutofixSettings) -> int:
    """Queue automatic fixes for one project's new, unresolved error issues,
    within its daily limit. Returns how many were queued."""
    day_ago = timezone.now() - timedelta(days=1)
    used = await FixAttempt.objects.filter(
        project_id=config.project_id,
        trigger=FixTrigger.AUTO,
        created__gte=day_ago,
    ).acount()
    room = config.daily_limit - used
    if room <= 0:
        return 0
    candidates = (
        Issue.objects.filter(
            project_id=config.project_id,
            first_seen__gte=config.auto_since,
            index__organization_id=config.organization_id,
            index__status=EventStatus.UNRESOLVED,
            index__level__gte=LogLevel.ERROR,
            index__count__gte=config.min_events,
        )
        .exclude(Exists(FixAttempt.objects.filter(issue_id=OuterRef("pk"))))
        .order_by("first_seen")
        .values_list("id", flat=True)[:room]
    )
    queued = 0
    async for issue_id in candidates:
        try:
            await FixAttempt.objects.acreate(
                organization_id=config.organization_id,
                project_id=config.project_id,
                issue_id=issue_id,
                trigger=FixTrigger.AUTO,
                agent=config.agent,
                repository=config.repository,
            )
            queued += 1
        except IntegrityError:
            continue
    return queued


@task
async def queue_auto_fixes():
    """Start fix runs for projects in automatic mode."""
    await expire_stale_attempts()
    configs = AutofixSettings.objects.filter(
        mode=AutofixMode.AUTO,
        auto_since__isnull=False,
        project__is_deleted=False,
    ).exclude(repository="")
    async for config in configs:
        await queue_for_project(config)
