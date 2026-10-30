"""Send sample error events to the local GlitchTip project via the store endpoint."""
import json
import random
import sys
import time
import urllib.request
import uuid
from datetime import datetime, timedelta, timezone

KEY = sys.argv[1]
URL = "http://localhost:8000/api/1/store/"

ERRORS = [
    ("TypeError", "Cannot read properties of undefined (reading 'id')", "javascript", "src/components/UserCard.tsx", "renderAvatar"),
    ("ReferenceError", "stripe is not defined", "javascript", "src/checkout/pay.ts", "submitPayment"),
    ("ZeroDivisionError", "division by zero", "python", "app/billing/invoice.py", "compute_unit_price"),
    ("KeyError", "'customer_id'", "python", "app/api/webhooks.py", "handle_stripe_event"),
    ("IntegrityError", "duplicate key value violates unique constraint \"users_email_key\"", "python", "app/accounts/service.py", "create_user"),
    ("TimeoutError", "Request to https://api.partner.example/v2/orders timed out after 30000ms", "javascript", "src/lib/http.ts", "fetchWithRetry"),
    ("ValueError", "invalid literal for int() with base 10: 'abc'", "python", "app/search/filters.py", "parse_page"),
    ("ChunkLoadError", "Loading chunk 742 failed.", "javascript", "src/router.ts", "loadRoute"),
]
ENVS = ["production", "production", "production", "staging"]
RELEASES = ["web@2.4.0", "web@2.4.1", "web@2.5.0"]
BROWSERS = ["Chrome 141", "Safari 26.1", "Firefox 144", "Edge 141"]


def frames(platform, filename, function):
    lib = ["node_modules/react-dom/cjs/react-dom.development.js", "node_modules/@tanstack/query-core/build/lib/query.js"] if platform == "javascript" else ["/usr/local/lib/python3.13/site-packages/django/core/handlers/base.py", "/usr/local/lib/python3.13/site-packages/django/views/generic/base.py"]
    out = [{"filename": f, "function": "dispatch", "lineno": random.randint(50, 900), "in_app": False} for f in lib]
    out.append({
        "filename": filename.replace(".py", "_views.py").replace(".ts", "Page.ts"),
        "function": "handle",
        "lineno": 42,
        "in_app": True,
    })
    out.append({
        "filename": filename,
        "function": function,
        "lineno": 87,
        "in_app": True,
        "pre_context": ["", f"def {function}(data):" if platform == "python" else f"export function {function}(data) {{", "    total = data.amount"],
        "context_line": "    return total / data.quantity" if platform == "python" else "  return data.user.id;",
        "post_context": ["", ""],
    })
    return out


def send(i, err, when):
    etype, value, platform, filename, function = err
    env = random.choice(ENVS)
    event = {
        "event_id": uuid.uuid4().hex,
        "timestamp": when.isoformat(),
        "platform": platform,
        "level": "error",
        "environment": env,
        "release": random.choice(RELEASES),
        "server_name": f"web-{random.randint(1, 4)}",
        "user": {"id": str(random.randint(1, 400)), "email": f"user{random.randint(1, 400)}@example.com"},
        "tags": {"browser": random.choice(BROWSERS), "region": random.choice(["ap-northeast-2", "us-east-1"])},
        "request": {"url": f"https://app.example.com/{function.lower()}", "method": "POST" if i % 2 else "GET"},
        "breadcrumbs": {"values": [
            {"timestamp": (when - timedelta(seconds=9)).isoformat(), "category": "navigation", "message": "/dashboard -> /checkout"},
            {"timestamp": (when - timedelta(seconds=4)).isoformat(), "category": "ui.click", "message": "button#pay-now"},
            {"timestamp": (when - timedelta(seconds=1)).isoformat(), "category": "http", "level": "warning", "data": {"url": "/api/orders", "status_code": 500, "method": "POST"}},
        ]},
        "exception": {"values": [{"type": etype, "value": value, "stacktrace": {"frames": frames(platform, filename, function)}}]},
    }
    req = urllib.request.Request(URL, data=json.dumps(event).encode(), method="POST", headers={
        "Content-Type": "application/json",
        "X-Sentry-Auth": f"Sentry sentry_version=7, sentry_key={KEY}, sentry_client=seed/1.0",
    })
    urllib.request.urlopen(req, timeout=10).read()


now = datetime.now(timezone.utc)
sent = 0
for idx, err in enumerate(ERRORS):
    # Skewed counts so the list has a visible hierarchy of noisy vs rare issues.
    for _ in range(random.randint(1, 4) * (len(ERRORS) - idx)):
        send(sent, err, now - timedelta(minutes=random.randint(0, 60 * 24 * 6)))
        sent += 1
print("sent", sent)
