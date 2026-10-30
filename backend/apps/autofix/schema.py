from datetime import datetime
from decimal import Decimal
from typing import Literal

from ninja import Field, ModelSchema
from pydantic import ConfigDict

from glitchtip.schema import CamelSchema

from .models import AutofixSettings, FixAttempt

REPOSITORY_PATTERN = r"^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$"


class AutofixSettingsIn(CamelSchema):
    mode: Literal["off", "manual", "auto"]
    agent: Literal["claude", "codex"] = "claude"
    repository: str = Field("", pattern=r"^$|" + REPOSITORY_PATTERN, max_length=200)
    default_branch: str = Field("main", min_length=1, max_length=200)
    code_root: str = Field("", max_length=200)
    min_events: int = Field(1, ge=1, le=100_000)
    daily_limit: int = Field(5, ge=1, le=100)


class AutofixSettingsSchema(CamelSchema, ModelSchema):
    is_ready: bool

    class Meta:
        model = AutofixSettings
        fields = [
            "mode",
            "agent",
            "repository",
            "default_branch",
            "code_root",
            "min_events",
            "daily_limit",
            "auto_since",
        ]


class FixAttemptSchema(CamelSchema, ModelSchema):
    id: str
    issue_id: str
    project_id: str
    created: datetime = Field(serialization_alias="dateCreated")
    cost_usd: Decimal | None = None
    issue_title: str = Field(validation_alias="issue.title")
    issue_short_id: str = Field(validation_alias="issue.short_id_display")

    class Meta:
        model = FixAttempt
        fields = [
            "status",
            "trigger",
            "agent",
            "model",
            "repository",
            "branch",
            "pr_url",
            "pr_number",
            "summary",
            "confidence",
            "failure_reason",
            "triage",
            "ci_status",
            "ci_iterations",
            "input_tokens",
            "cached_input_tokens",
            "output_tokens",
            "duration_s",
            "started_at",
            "finished_at",
        ]

    model_config = ConfigDict(coerce_numbers_to_str=True)


class FixUsageSchema(CamelSchema):
    since: datetime
    attempts: int
    prs_opened: int
    merged: int
    no_fix: int
    failed: int
    cost_usd: Decimal
    input_tokens: int
    output_tokens: int


# Runner-facing


class RunnerJobSchema(CamelSchema):
    id: int
    issue_id: int
    short_id: str
    issue_url: str
    title: str
    repository: str
    default_branch: str
    agent: str
    code_root: str
    triage: bool
    report: str


class RunnerUpdateIn(CamelSchema):
    status: (
        Literal[
            "triaging",
            "running",
            "pr_opened",
            "no_fix",
            "failed",
            "merged",
            "closed",
        ]
        | None
    ) = None
    model: str | None = Field(None, max_length=64)
    branch: str | None = Field(None, max_length=255)
    pr_url: str | None = Field(None, max_length=500)
    pr_number: int | None = None
    summary: str | None = Field(None, max_length=20_000)
    confidence: Literal["high", "medium", "low", ""] | None = None
    failure_reason: str | None = Field(None, max_length=5_000)
    triage: dict | None = None
    ci_status: Literal["", "pending", "passed", "failed"] | None = None
    ci_iterations: int | None = Field(None, ge=0, le=20)
    # Usage is reported as increments so each agent run adds its own share.
    add_input_tokens: int = Field(0, ge=0)
    add_cached_input_tokens: int = Field(0, ge=0)
    add_output_tokens: int = Field(0, ge=0)
    add_cost_usd: Decimal = Field(Decimal(0), ge=0, max_digits=10, decimal_places=4)
    add_duration_s: int = Field(0, ge=0)


class RunnerOpenPRSchema(CamelSchema):
    id: int
    repository: str
    pr_number: int
