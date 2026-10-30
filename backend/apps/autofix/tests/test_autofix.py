from datetime import timedelta

from django.test import override_settings
from django.urls import reverse
from django.utils import timezone
from model_bakery import baker

from apps.issue_events.constants import EventStatus, LogLevel
from apps.issue_events.models import IssueIndex
from glitchtip.test_utils.test_case import GlitchTestCase

from ..models import AutofixSettings, FixAttempt, FixStatus, FixTrigger
from ..tasks import queue_for_project

RUNNER_TOKEN = "runner-secret"


def make_issue(project, *, level=LogLevel.ERROR, count=1, first_seen=None):
    issue = baker.make(
        "issue_events.Issue",
        project=project,
        first_seen=first_seen or timezone.now(),
    )
    IssueIndex.objects.filter(issue_id=issue.id).update(level=level, count=count)
    return issue


class RequestFixTestCase(GlitchTestCase):
    @classmethod
    def setUpTestData(cls):
        cls.create_user()
        cls.issue = make_issue(cls.project)
        cls.url = reverse(
            "api:request_issue_fix", args=[cls.organization.slug, cls.issue.id]
        )

    def setUp(self):
        self.client.force_login(self.user)

    def test_requires_setup_then_allows_one_active_run(self):
        self.assertEqual(self.client.post(self.url).status_code, 400)
        AutofixSettings.objects.create(
            organization=self.organization,
            project=self.project,
            mode="manual",
            repository="acme/shop",
        )
        res = self.client.post(self.url)
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.json()["status"], "queued")
        self.assertEqual(self.client.post(self.url).status_code, 409)

        FixAttempt.objects.update(status=FixStatus.NO_FIX)
        self.assertEqual(self.client.post(self.url).status_code, 201)


@override_settings(CATCHNET_RUNNER_TOKEN=RUNNER_TOKEN)
class RunnerTestCase(GlitchTestCase):
    @classmethod
    def setUpTestData(cls):
        cls.create_project()
        cls.issue = make_issue(cls.project)
        AutofixSettings.objects.create(
            organization=cls.organization,
            project=cls.project,
            mode="manual",
            repository="acme/shop",
            code_root="/app/",
        )
        cls.claim_url = reverse("api:claim_job")

    def auth(self, token=RUNNER_TOKEN):
        return {"HTTP_AUTHORIZATION": f"Bearer {token}"}

    def test_rejects_wrong_or_unset_token(self):
        self.assertEqual(
            self.client.post(self.claim_url, **self.auth("nope")).status_code, 401
        )
        with override_settings(CATCHNET_RUNNER_TOKEN=""):
            self.assertEqual(
                self.client.post(self.claim_url, **self.auth("")).status_code, 401
            )

    def test_claim_update_and_merge_resolves_issue(self):
        self.assertEqual(
            self.client.post(self.claim_url, **self.auth()).status_code, 204
        )
        attempt = FixAttempt.objects.create(
            organization=self.organization,
            project=self.project,
            issue=self.issue,
            agent="claude",
            repository="acme/shop",
        )
        res = self.client.post(self.claim_url, **self.auth())
        self.assertEqual(res.status_code, 200)
        job = res.json()
        self.assertEqual(job["id"], attempt.id)
        self.assertIn("/app/", job["report"])
        attempt.refresh_from_db()
        self.assertEqual(attempt.status, FixStatus.TRIAGING)
        # Claimed jobs are not handed out twice.
        self.assertEqual(
            self.client.post(self.claim_url, **self.auth()).status_code, 204
        )

        update_url = reverse("api:update_attempt", args=[attempt.id])
        for body in (
            {"status": "running", "addCostUsd": "0.0100", "addInputTokens": 10},
            {
                "status": "pr_opened",
                "prNumber": 7,
                "addCostUsd": "0.0200",
                "addInputTokens": 5,
            },
            {"status": "merged"},
        ):
            res = self.client.patch(
                update_url, body, content_type="application/json", **self.auth()
            )
            self.assertEqual(res.status_code, 204)
        attempt.refresh_from_db()
        self.assertEqual(str(attempt.cost_usd), "0.0300")
        self.assertEqual(attempt.input_tokens, 15)
        self.assertIsNotNone(attempt.finished_at)
        self.assertEqual(
            IssueIndex.objects.get(issue_id=self.issue.id).status, EventStatus.RESOLVED
        )

    def test_stale_runs_are_failed_on_claim(self):
        attempt = FixAttempt.objects.create(
            organization=self.organization,
            project=self.project,
            issue=self.issue,
            agent="claude",
            repository="acme/shop",
            status=FixStatus.RUNNING,
        )
        FixAttempt.objects.filter(id=attempt.id).update(
            updated=timezone.now() - timedelta(hours=2)
        )
        self.client.post(self.claim_url, **self.auth())
        attempt.refresh_from_db()
        self.assertEqual(attempt.status, FixStatus.FAILED)


class AutoQueueTestCase(GlitchTestCase):
    @classmethod
    def setUpTestData(cls):
        cls.create_project()

    async def test_picks_new_unresolved_errors_within_limit(self):
        now = timezone.now()
        config = await AutofixSettings.objects.acreate(
            organization=self.organization,
            project=self.project,
            mode="auto",
            repository="acme/shop",
            auto_since=now - timedelta(hours=1),
            min_events=2,
            daily_limit=2,
        )
        from asgiref.sync import sync_to_async

        make = sync_to_async(make_issue)
        before_auto = await make(
            self.project, count=5, first_seen=now - timedelta(days=1)
        )
        warning = await make(self.project, level=LogLevel.WARNING, count=5)
        too_rare = await make(self.project, count=1)
        wanted = [await make(self.project, count=3) for _ in range(3)]

        self.assertEqual(await queue_for_project(config), 2)
        queued = {a.issue_id async for a in FixAttempt.objects.all()}
        self.assertTrue(queued <= {i.id for i in wanted})
        self.assertFalse(queued & {before_auto.id, warning.id, too_rare.id})
        self.assertTrue(
            await FixAttempt.objects.filter(trigger=FixTrigger.AUTO).acount() == 2
        )
        # The daily limit is spent; nothing more until it frees up.
        self.assertEqual(await queue_for_project(config), 0)
