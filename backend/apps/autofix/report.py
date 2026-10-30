"""The error report a fix run starts from.

The agent never talks to the database; it gets this text. It reuses the MCP
server's budget-bounded event view so a huge event (deep stacks, many
breadcrumbs, big locals) cannot blow up the prompt.
"""

import json

from apps.issue_events.models import Issue, IssueEvent
from apps.mcp.event_payload import serialize_event_lean
from apps.mcp.serializers import serialize_issue

REPORT_TOKEN_BUDGET = 6000


async def build_report(issue: Issue, code_root: str) -> str:
    issue_data = serialize_issue(issue)
    event = (
        await IssueEvent.objects.filter(
            organization_id=issue.project.organization_id, issue_id=issue.id
        )
        .order_by("-id")
        .afirst()
    )
    parts = [
        f"Issue {issue.short_id_display}: {issue.title}",
        f"Culprit: {issue.culprit or 'unknown'}",
        f"Seen {issue.count} times, first {issue.first_seen:%Y-%m-%d %H:%M} UTC,"
        f" last {issue.last_seen:%Y-%m-%d %H:%M} UTC.",
    ]
    if code_root:
        parts.append(
            f"Stack trace paths start with the deployment prefix {code_root!r};"
            " strip it to find the file in the repository."
        )
    if event:
        lean = serialize_event_lean(
            event, token_budget=REPORT_TOKEN_BUDGET, issue=issue_data
        )
        parts += ["", "Latest event (JSON):", json.dumps(lean, indent=1, default=str)]
    else:
        parts += ["", "No stored event; issue metadata:", json.dumps(issue.metadata)]
    return "\n".join(parts)
