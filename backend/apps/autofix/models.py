from django.conf import settings
from django.db import models
from django.db.models import Q

from glitchtip.base_models import CreatedModel, OrgScopedModel


class AutofixMode(models.TextChoices):
    OFF = "off", "Off"
    MANUAL = "manual", "On request"
    AUTO = "auto", "Automatic"


class AutofixAgent(models.TextChoices):
    CLAUDE = "claude", "Claude Code"
    CODEX = "codex", "Codex"


class AutofixSettings(OrgScopedModel, models.Model):
    """Per-project autofix setup: which repository, which agent, and when
    catchnet may start a fix without being asked."""

    org_field = "organization_id"
    undeleted_through = ("project",)

    organization = models.ForeignKey(
        "organizations_ext.Organization", on_delete=models.CASCADE
    )
    project = models.OneToOneField(
        "projects.Project", on_delete=models.CASCADE, related_name="autofix_settings"
    )
    # Automatic mode only picks up issues first seen after this moment, so
    # switching it on does not unleash a fix run on every old issue.
    auto_since = models.DateTimeField(null=True, blank=True)
    updated = models.DateTimeField(auto_now=True)
    min_events = models.PositiveIntegerField(default=1)
    daily_limit = models.PositiveSmallIntegerField(default=5)
    mode = models.CharField(
        max_length=8, choices=AutofixMode.choices, default=AutofixMode.OFF
    )
    agent = models.CharField(
        max_length=16, choices=AutofixAgent.choices, default=AutofixAgent.CLAUDE
    )
    # "owner/name" on GitHub.
    repository = models.CharField(max_length=200, blank=True)
    default_branch = models.CharField(max_length=200, default="main")
    # Stack trace paths start with this deployment prefix (e.g. "/app/");
    # the agent is told to strip it to find the file in the repository.
    code_root = models.CharField(max_length=200, blank=True)

    @property
    def is_ready(self) -> bool:
        return self.mode != AutofixMode.OFF and bool(self.repository)


class FixStatus(models.TextChoices):
    QUEUED = "queued", "Queued"
    TRIAGING = "triaging", "Triaging"
    RUNNING = "running", "Fixing"
    PR_OPENED = "pr_opened", "PR opened"
    NO_FIX = "no_fix", "No fix"
    FAILED = "failed", "Failed"
    MERGED = "merged", "Merged"
    CLOSED = "closed", "PR closed"


ACTIVE_STATUSES = [FixStatus.QUEUED, FixStatus.TRIAGING, FixStatus.RUNNING]
TERMINAL_STATUSES = [
    FixStatus.NO_FIX,
    FixStatus.FAILED,
    FixStatus.MERGED,
    FixStatus.CLOSED,
]


class FixTrigger(models.TextChoices):
    MANUAL = "manual", "Requested"
    AUTO = "auto", "Automatic"


class CIStatus(models.TextChoices):
    NONE = "", "None"
    PENDING = "pending", "Pending"
    PASSED = "passed", "Passed"
    FAILED = "failed", "Failed"


class FixAttempt(OrgScopedModel, CreatedModel):
    """One run of the hotfix agent against one issue."""

    org_field = "organization_id"
    undeleted_through = ("project", "issue")

    organization = models.ForeignKey(
        "organizations_ext.Organization", on_delete=models.CASCADE
    )
    project = models.ForeignKey("projects.Project", on_delete=models.CASCADE)
    issue = models.ForeignKey(
        "issue_events.Issue", on_delete=models.CASCADE, related_name="fix_attempts"
    )
    requested_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="+",
    )
    started_at = models.DateTimeField(null=True, blank=True)
    finished_at = models.DateTimeField(null=True, blank=True)
    updated = models.DateTimeField(auto_now=True)
    input_tokens = models.BigIntegerField(default=0)
    cached_input_tokens = models.BigIntegerField(default=0)
    output_tokens = models.BigIntegerField(default=0)
    cost_usd = models.DecimalField(max_digits=10, decimal_places=4, null=True)
    duration_s = models.PositiveIntegerField(default=0)
    pr_number = models.PositiveIntegerField(null=True, blank=True)
    ci_iterations = models.PositiveSmallIntegerField(default=0)
    status = models.CharField(
        max_length=16, choices=FixStatus.choices, default=FixStatus.QUEUED
    )
    trigger = models.CharField(
        max_length=8, choices=FixTrigger.choices, default=FixTrigger.MANUAL
    )
    agent = models.CharField(max_length=16, choices=AutofixAgent.choices)
    model = models.CharField(max_length=64, blank=True)
    confidence = models.CharField(max_length=8, blank=True)
    ci_status = models.CharField(
        max_length=8, choices=CIStatus.choices, default=CIStatus.NONE, blank=True
    )
    repository = models.CharField(max_length=200)
    branch = models.CharField(max_length=255, blank=True)
    pr_url = models.URLField(max_length=500, blank=True)
    runner_id = models.CharField(max_length=64, blank=True)
    summary = models.TextField(blank=True)
    failure_reason = models.TextField(blank=True)
    triage = models.JSONField(default=dict, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["issue"],
                condition=Q(status__in=ACTIVE_STATUSES),
                name="autofix_one_active_attempt_per_issue",
            )
        ]
        indexes = [models.Index(fields=["status", "created"])]
