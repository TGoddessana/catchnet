import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  OnDestroy,
  resource,
  signal,
} from "@angular/core";
import { TitleCasePipe } from "@angular/common";
import { RouterLink } from "@angular/router";
import { MatButtonModule } from "@angular/material/button";
import { MatIconModule } from "@angular/material/icon";
import { MatSnackBar } from "@angular/material/snack-bar";
import {
  AutofixService,
  FixAttempt,
  fixStatus,
} from "src/app/api/autofix.service";
import { OrganizationsService } from "src/app/api/organizations.service";
import { DaysAgoPipe } from "src/app/shared/days-ago.pipe";

const POLL_MS = 4000;

const AGENT_NAMES: Record<string, string> = {
  claude: "Claude Code",
  codex: "Codex",
};

/** The agent ends with ROOT CAUSE / FIX / TEST / CONFIDENCE lines; show
 * those as labelled parts and fall back to the raw text. */
export function parseFixSummary(text: string | null | undefined) {
  const parts: { label: string; text: string; segments: Segment[] }[] = [];
  if (!text) return parts;
  const labels: [string, string][] = [
    ["ROOT CAUSE", $localize`Cause`],
    ["FIX", $localize`Change`],
    ["TEST", $localize`Test`],
  ];
  for (const [key, label] of labels) {
    const match = text.match(
      new RegExp(
        `^${key}:\\s*([\\s\\S]+?)(?=^[A-Z][A-Z ]*:|$(?![\\s\\S]))`,
        "m",
      ),
    );
    if (match) parts.push(part(label, match[1]));
  }
  if (parts.length === 0) parts.push(part($localize`Summary`, text));
  return parts;
}

interface Segment {
  code: boolean;
  text: string;
}

/** Split `inline code` out so it renders as code, not backticks. */
function part(label: string, raw: string) {
  const text = raw.trim();
  const segments = text
    .split(/(`[^`\n]+`)/)
    .filter(Boolean)
    .map((piece) =>
      piece.startsWith("`") && piece.endsWith("`") && piece.length > 2
        ? { code: true, text: piece.slice(1, -1) }
        : { code: false, text: piece },
    );
  return { label, text, segments };
}

@Component({
  selector: "gt-autofix-panel",
  templateUrl: "./autofix-panel.component.html",
  styleUrls: ["./autofix-panel.component.scss"],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    MatButtonModule,
    MatIconModule,
    DaysAgoPipe,
    TitleCasePipe,
  ],
})
export class AutofixPanelComponent implements OnDestroy {
  private autofix = inject(AutofixService);
  private organizationsService = inject(OrganizationsService);
  private snackbar = inject(MatSnackBar);

  orgSlug = input.required<string>();
  issueId = input.required<number>();
  projectSlug = input.required<string>();

  canWriteProject = this.organizationsService.canWriteProject;
  requesting = signal(false);
  #timer: ReturnType<typeof setTimeout> | null = null;

  settings = resource({
    params: () => ({ org: this.orgSlug(), project: this.projectSlug() }),
    loader: ({ params }) =>
      this.autofix.getSettings(params.org, params.project),
  });

  attempts = resource({
    params: () => ({ org: this.orgSlug(), issue: this.issueId() }),
    loader: ({ params }) =>
      this.autofix.listIssueFixes(params.org, params.issue),
  });

  loaded = computed(() => this.settings.hasValue() && this.attempts.hasValue());
  latest = computed<FixAttempt | undefined>(() => this.attempts.value()?.[0]);
  earlier = computed(() =>
    Math.max(0, (this.attempts.value()?.length ?? 0) - 1),
  );
  status = computed(() => {
    const latest = this.latest();
    return latest ? fixStatus(latest.status) : null;
  });
  summaryParts = computed(() => parseFixSummary(this.latest()?.summary));
  agentName = computed(() => {
    const latest = this.latest();
    return latest ? (AGENT_NAMES[latest.agent] ?? latest.agent) : "";
  });
  failureText = computed(() => {
    const latest = this.latest();
    if (!latest) return "";
    return (latest.failureReason || "").replace(/^Triage:\s*/, "");
  });
  steps = computed(() => {
    const status = this.latest()?.status;
    const order = ["queued", "triaging", "running"];
    const at = order.indexOf(status ?? "");
    return [
      {
        label: $localize`Read the error`,
        state: at > 1 ? "done" : at >= 0 ? "now" : "todo",
      },
      {
        label: $localize`Write and test a fix`,
        state: at === 2 ? "now" : "todo",
      },
      { label: $localize`Open a pull request`, state: "todo" },
    ];
  });

  constructor() {
    // Poll while a run is in progress; stop as soon as it settles.
    effect(() => {
      const busy = this.status()?.busy ?? false;
      const pendingCI = this.latest()?.ciStatus === "pending";
      this.clearTimer();
      if (busy || pendingCI) {
        this.#timer = setTimeout(() => this.attempts.reload(), POLL_MS);
      }
    });
  }

  ngOnDestroy() {
    this.clearTimer();
  }

  private clearTimer() {
    if (this.#timer) clearTimeout(this.#timer);
    this.#timer = null;
  }

  async requestFix() {
    this.requesting.set(true);
    try {
      await this.autofix.requestFix(this.orgSlug(), this.issueId());
      this.attempts.reload();
    } catch (err: unknown) {
      const detail = (err as { detail?: string })?.detail;
      this.snackbar.open(
        detail || $localize`Could not start a fix. Try again.`,
      );
    } finally {
      this.requesting.set(false);
    }
  }

  formatCost(cost: string | null | undefined) {
    if (cost === null || cost === undefined) return "";
    const value = Number(cost);
    return value < 0.01 ? "<$0.01" : `$${value.toFixed(2)}`;
  }

  formatDuration(seconds: number | undefined) {
    if (!seconds) return "";
    return seconds < 60 ? `${seconds}s` : `${Math.round(seconds / 60)}m`;
  }
}
