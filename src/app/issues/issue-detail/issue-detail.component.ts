import {
  Component,
  OnInit,
  ChangeDetectionStrategy,
  inject,
  computed,
  input,
  effect,
  signal,
} from "@angular/core";
import { FormControl, FormGroup } from "@angular/forms";
import { ActivatedRoute, RouterModule } from "@angular/router";
import { Clipboard } from "@angular/cdk/clipboard";
import { MatTabsModule } from "@angular/material/tabs";
import { MatMenuModule } from "@angular/material/menu";
import { MatDividerModule } from "@angular/material/divider";
import { MatSnackBar } from "@angular/material/snack-bar";
import { MatCardModule } from "@angular/material/card";
import { BreakpointObserver, Breakpoints } from "@angular/cdk/layout";
import { toSignal } from "@angular/core/rxjs-interop";
import { IssueDetailService } from "./issue-detail.service";
import { DaysAgoPipe } from "../../shared/days-ago.pipe";
import { IssueDetailTagsComponent } from "./issue-detail-tags/issue-detail-tags.component";
import { MatIconModule } from "@angular/material/icon";
import { MatButtonModule } from "@angular/material/button";
import { OrganizationsService } from "src/app/api/organizations.service";
import { DatePipe, TitleCasePipe } from "@angular/common";
import { IssueStatus } from "../interfaces";
import { ConfirmDialogComponent } from "src/app/shared/confirm-dialog/confirm-dialog.component";
import { MatDialog } from "@angular/material/dialog";

const STATUS_CONFIG = {
  resolved: { label: $localize`Fixed`, icon: "check", tone: "success" },
  unresolved: { label: $localize`Open`, icon: "notifications", tone: "accent" },
  ignored: { label: $localize`Muted`, icon: "notifications_off", tone: "neutral" },
} as const;

type IssueStatusType = keyof typeof STATUS_CONFIG;

@Component({
  selector: "gt-issue-detail",
  templateUrl: "./issue-detail.component.html",
  styleUrls: ["./issue-detail.component.scss"],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatCardModule,
    RouterModule,
    MatTabsModule,
    MatMenuModule,
    MatDividerModule,
    MatIconModule,
    MatButtonModule,
    IssueDetailTagsComponent,
    TitleCasePipe,
    DatePipe,
    DaysAgoPipe,
  ],
})
export class IssueDetailComponent implements OnInit {
  private issueService = inject(IssueDetailService);
  private organizationsService = inject(OrganizationsService);
  private route = inject(ActivatedRoute);
  protected breakPointObserver = inject(BreakpointObserver);
  private dialog = inject(MatDialog);
  private clipboard = inject(Clipboard);
  private snackbar = inject(MatSnackBar);

  issue = this.issueService.issue;
  issueTitle = computed(() => {
    const issue = this.issue();
    if (!issue) {
      return ["", null] as [string, string | null];
    }
    const metadata = issue.metadata ?? {};
    const culprit = issue.culprit;
    const fallback = issue.title || "";

    switch (issue.type) {
      case "error":
        if (metadata.type) {
          return [metadata.type, culprit] as [string, string | null];
        }
        return [metadata.function || fallback, culprit] as [
          string,
          string | null,
        ];
      case "csp":
        return [metadata.directive || fallback, metadata.uri || null] as [
          string,
          string | null,
        ];
      case "default":
        return [metadata.message || fallback, metadata.origin || null] as [
          string,
          string | null,
        ];
      default:
        return [metadata.title || fallback, null] as [string, string | null];
    }
  });
  issueSubtitle = computed<string>(() => {
    const issue = this.issue();
    if (!issue || issue.metadata === null) {
      return "";
    }
    const metadata = issue.metadata;
    switch (issue.type) {
      case "error":
        return metadata.value as string;
      case "csp":
        return metadata.message as string;
      case "default":
        return "";
      default:
        return issue.culprit as string;
    }
  });

  private statusConfig = computed(
    () => STATUS_CONFIG[(this.issue()?.status ?? "unresolved") as IssueStatusType],
  );
  statusIcon = computed(() => this.statusConfig().icon);
  statusLabel = computed(() => this.statusConfig().label);
  statusTone = computed(() => this.statusConfig().tone);

  /** Badge and dot tone for the level. The level is always shown as text. */
  levelTone = computed(() => {
    switch (this.issue()?.level) {
      case "fatal":
      case "error":
        return "error";
      case "warning":
        return "warning";
      default:
        return "neutral";
    }
  });

  resolvedInRelease = computed(() => {
    const issue = this.issue();
    if (!issue || issue.status !== "resolved") return null;
    return issue.statusDetails?.["inRelease"] ?? null;
  });

  initialLoadComplete = this.issueService.issueInitialLoadComplete;
  form = new FormGroup({
    assignee: new FormControl(""),
  });
  issueID = input.required<string>({ alias: "issue-id" });
  organization = this.organizationsService.activeOrganization;
  participantCountPluralMapping: { [k: string]: string } = {
    "=0": "No Participants",
    "=1": "1 Participant",
    other: "# Participants",
  };

  isMobile = signal(false);
  smallBreakpointSignal = toSignal(
    this.breakPointObserver.observe([Breakpoints.Small, Breakpoints.XSmall]),
  );

  constructor() {
    effect(() => {
      this.issueService.issueID.set(this.issueID());
    });

    effect(() => {
      const breakpointResult = this.smallBreakpointSignal();
      if (breakpointResult?.matches) {
        this.isMobile.set(true);
      } else {
        this.isMobile.set(false);
      }
    });
  }

  ngOnInit() {
    this.issueService.clearState();
  }

  updateIssueStatus(status: IssueStatus) {
    this.issueService.setStatus(status);
  }

  resolveInNextRelease() {
    this.issueService.setStatus("resolved", { inNextRelease: true });
  }

  deleteIssue() {
    const id = this.issueID();
    if (!id) return;

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: $localize`Delete issue?`,
        message: $localize`Are you sure you want to delete this issue? You will permanently lose this issue and all associated events.`,
        confirmText: $localize`Delete`,
      },
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.issueService.deleteIssue(id.toString());
      }
    });
  }

  copyLink() {
    this.clipboard.copy(window.location.href.split("?")[0]);
    this.snackbar.open($localize`Link copied`, undefined, { duration: 2500 });
  }

  generateBackLink(projectId: string) {
    return {
      ...this.route.snapshot.queryParams,
      project: projectId,
    };
  }
}
