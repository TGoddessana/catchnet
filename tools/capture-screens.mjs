// --eval runs a snippet after each page loads (to open a menu, select a
// row) before the screenshot.
// --probe evaluates an expression and prints its JSON result.
// --dump prints the outer HTML of the first match of a selector.
// --height sets a taller viewport, since the app scrolls inside its sheet
// and a full-page screenshot only shows the first screen.
// Logs in as the local design-check user and screenshots every catchnet
// screen at 1440, 768 and 390px. Usage:
//   node tools/capture-screens.mjs <out-dir> [base-url] [--only name,name] [--dark]
// Reuses the taste skill's zero-dependency CDP client (Node 22+, Chrome).
import { readFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { Browser, sleep } from "../.claude/skills/design-taste-frontend/scripts/lib/cdp.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const flag = (n) => { const i = args.indexOf(n); if (i < 0) return null; const v = args[i + 1]; args.splice(i, 2); return v; };
const has = (n) => { const i = args.indexOf(n); if (i < 0) return false; args.splice(i, 1); return true; };
const only = flag("--only")?.split(",");
const widthsArg = flag("--widths");
const heightArg = flag("--height");
const evalArg = flag("--eval");
const dumpArg = flag("--dump");
const probeArg = flag("--probe");
const dark = has("--dark");
const out = args[0] || "screens";
const base = (args[1] || "http://localhost:4201").replace(/\/$/, "");
const env = Object.fromEntries(
  readFileSync(join(here, "design-check-user.env"), "utf8")
    .split("\n").filter((l) => l && !l.startsWith("#")).map((l) => l.split("=")),
);

const browser = await Browser.launch();
const page = await browser.newPage({ width: 1440, height: 900 });
await page.goto(`${base}/login`, { settleMs: 1500 });
for (let i = 0; i < 20 && !(await page.eval(() => !!document.querySelector('input[type="password"]'))); i++) await sleep(500);
await page.eval(([email, pw]) => {
  const set = (el, v) => { el.value = v; el.dispatchEvent(new Event("input", { bubbles: true })); };
  set(document.querySelector('input[type="email"], input[name="email"]'), email);
  set(document.querySelector('input[type="password"]'), pw);
  document.querySelector('input[type="password"]').form.requestSubmit();
}, [env.DESIGN_CHECK_EMAIL, env.DESIGN_CHECK_PASSWORD]);
await sleep(2500);

// Real ids from the API so detail screens show data.
const ids = await page.eval(async () => {
  const j = async (u) => { const r = await fetch(u, { credentials: "include" }); return r.ok ? r.json() : null; };
  const issues = (await j("/api/0/organizations/org/issues/?limit=1")) || [];
  const issue = issues[0]?.id;
  const events = issue ? (await j(`/api/0/issues/${issue}/events/?limit=1`)) || [] : [];
  const monitors = (await j("/api/0/organizations/org/monitors/")) || [];
  const releases = (await j("/api/0/organizations/org/releases/")) || [];
  const teams = (await j("/api/0/organizations/org/teams/")) || [];
  const members = (await j("/api/0/organizations/org/members/")) || [];
  const fixes = (await j("/api/0/organizations/org/fixes/")) || [];
  const fixed = fixes.find((f) => f.prUrl)?.issueID;
  return { issue, event: events[0]?.eventID, monitor: monitors[0]?.id, release: releases[0]?.version, team: teams[0]?.slug, member: members[0]?.id, fixed };
});
console.log("ids", JSON.stringify(ids));

const S = [
  ["home", "/"],
  ["issues", "/org/issues"],
  ["issue", ids.issue && `/org/issues/${ids.issue}`],
  ["issue-events", ids.issue && `/org/issues/${ids.issue}/events`],
  ["issue-comments", ids.issue && `/org/issues/${ids.issue}/comments`],
  ["issue-feedback", ids.issue && `/org/issues/${ids.issue}/user-reports`],
  ["issue-merged", ids.issue && `/org/issues/${ids.issue}/merged`],
  ["issue-autofix", ids.fixed && `/org/issues/${ids.fixed}`],
  ["fixes", "/org/fixes"],
  ["performance", "/org/performance"],
  ["uptime", "/org/uptime-monitors"],
  ["uptime-new", "/org/uptime-monitors/new"],
  ["uptime-detail", ids.monitor && `/org/uptime-monitors/${ids.monitor}`],
  ["logs", "/org/logs"],
  ["releases", "/org/releases"],
  ["release", ids.release && `/org/releases/${encodeURIComponent(ids.release)}`],
  ["projects", "/org/projects"],
  ["settings", "/org/settings"],
  ["settings-projects", "/org/settings/projects"],
  ["settings-project", "/org/settings/projects/project"],
  ["settings-project-new", "/org/settings/projects/new"],
  ["settings-members", "/org/settings/members"],
  ["settings-member", ids.member && `/org/settings/members/${ids.member}`],
  ["settings-teams", "/org/settings/teams"],
  ["settings-team", ids.team && `/org/settings/teams/${ids.team}`],
  ["profile", "/profile"],
  ["profile-tokens", "/profile/auth-tokens"],
  ["profile-notifications", "/profile/notifications"],
  ["profile-mfa", "/profile/multi-factor-auth"],
  ["new-org", "/organizations/new"],
  ["system-info", "/system-info"],
].filter(([n, p]) => p && (!only || only.includes(n)));

mkdirSync(out, { recursive: true });
const widths = widthsArg ? widthsArg.split(",").map(Number) : [1440, 768, 390];
for (const w of widths) {
  const h = Number(heightArg) || (w < 600 ? 844 : w < 1000 ? 1024 : 900);
  await page.setViewport({ width: w, height: h, mobile: w < 600 });
  if (dark) await page.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: "dark" }] });
  for (const [name, path] of S) {
    await page.goto(base + path, { settleMs: 2200 });
    if (evalArg) {
      await page.eval(evalArg);
      await sleep(800);
    }
    if (probeArg) {
      console.log(name, JSON.stringify(await page.eval(probeArg)));
    }
    if (dumpArg) {
      console.log(name, await page.eval((sel) => document.querySelector(sel)?.outerHTML.slice(0, 3000) ?? "(none)", dumpArg));
    }
    await page.screenshot({ path: join(out, `${name}-${w}.jpg`), fullPage: w !== 1440, quality: 80 });
    await page.screenshot({ path: join(out, `${name}-${w}-fold.jpg`), quality: 80 });
  }
  console.log("done", w);
}
await browser.close();
