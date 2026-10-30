import { BreakpointObserver, Breakpoints } from "@angular/cdk/layout";
import {
  Component,
  ChangeDetectionStrategy,
  inject,
  input,
  effect,
  computed,
  OnInit,
  OnDestroy,
  signal,
  ViewChild,
} from "@angular/core";
import { DatePipe } from "@angular/common";
import { FormControl, FormGroup, ReactiveFormsModule } from "@angular/forms";
import { MatButtonModule } from "@angular/material/button";
import { MatCheckboxModule } from "@angular/material/checkbox";
import { MatDialog } from "@angular/material/dialog";
import { MatIconModule } from "@angular/material/icon";
import { MatTable, MatTableModule } from "@angular/material/table";
import { Router, ActivatedRoute, RouterLink } from "@angular/router";
import { IssuesService } from "../issues.service";
import { SettingsService } from "src/app/api/settings.service";
import { Issue, IssueStatus } from "../interfaces";
import { DaysAgoPipe } from "../../shared/days-ago.pipe";
import { IssueZeroStatesComponent } from "../issue-zero-states/issue-zero-states.component";
import { OrganizationsService } from "src/app/api/organizations.service";
import {
  stringArrAttribute,
  stringAttribute,
} from "src/app/shared/shared.utils";
import { ConfirmDialogComponent } from "src/app/shared/confirm-dialog/confirm-dialog.component";
import { LoadingOverlayComponent } from "src/app/shared/loading-overlay/loading-overlay.component";
import { EnvironmentsService } from "src/app/api/environments.service";
import { ListAppBar } from "src/app/list-elements/list-app-bar/list-app-bar";
import { IssueChart } from "./charts/issue-chart";
import { PaginationButtons } from "src/app/list-elements/pagination-buttons/pagination-buttons";
import { toSignal } from "@angular/core/rxjs-interop";
import { MatMenuModule } from "@angular/material/menu";
import { ProjectMultiselect } from "../../list-elements/project-multiselect/project-multiselect";
import { TimeRangeSelect } from "../../list-elements/timerange-select/time-range-select";
import { SearchHelpConfig } from "../../list-elements/data-filter-bar/data-filter-bar.component";

@Component({
  templateUrl: "./issues-page.html",
  styleUrls: ["./issues-page.scss"],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatTableModule,
    ReactiveFormsModule,
    MatCheckboxModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    LoadingOverlayComponent,
    RouterLink,
    IssueZeroStatesComponent,
    DatePipe,
    DaysAgoPipe,
    ListAppBar,
    IssueChart,
    PaginationButtons,
    ProjectMultiselect,
    TimeRangeSelect,
  ],
  providers: [IssuesService],
})
export class IssuesPage implements OnInit, OnDestroy {
  dialog = inject(MatDialog);
  protected service = inject(IssuesService);
  protected router = inject(Router);
  protected route = inject(ActivatedRoute);
  protected breakPointObserver = inject(BreakpointObserver);
  private organizationsService = inject(OrganizationsService);
  private settingsService = inject(SettingsService);
  #environmentsService = inject(EnvironmentsService);
  @ViewChild(MatTable) table?: MatTable<any>;

  orgSlug = input.required<string>({ alias: "org-slug" });
  cursor = input(undefined, { transform: stringAttribute });
  query = input(undefined, { transform: stringAttribute });
  start = input(undefined, { transform: stringAttribute });
  end = input(undefined, { transform: stringAttribute });
  sort = input(undefined, { transform: stringAttribute });
  projects = input([], { alias: "project", transform: stringArrAttribute });
  environment = input(undefined, { transform: stringAttribute });

  paginator = this.service.paginator;
  loading = this.service.loading;
  initialLoad = this.service.initialLoad;
  initialLoadComplete = this.service.initialLoadComplete;
  form = new FormGroup({
    query: new FormControl(""),
  });

  issues = this.service.issuesWithSelected;

  areAllSelected = this.service.areAllSelected;
  multipleProjectIssuesSelected = computed(() => {
    let selectedProjects = this.issues()
      .filter((issue) => issue.isSelected)
      .map((issue) => issue.project.id);
    let selectedProjectsSet = new Set(selectedProjects);
    return selectedProjectsSet.size > 1;
  });

  allColumns = ["select", "title", "trend", "events", "users", "lastSeen"];
  xSmallScreenColumns = ["select", "title"];
  mediumScreenColumns = ["select", "title", "events", "lastSeen"];
  isLargeScreen = signal(true);
  displayedColumns = signal(this.allColumns);
  private lastClickedIssueId = signal<string | null>(null);
  breakPointSignal = toSignal(
    this.breakPointObserver.observe([
      Breakpoints.Medium,
      Breakpoints.Small,
      Breakpoints.XSmall,
    ]),
  );
  statsPeriod = this.service.statsPeriod;
  statsChartDataFrame = this.service.statsChartDataFrame;
  issueStatsLoading = this.service.issueStatsLoading;
  serverTimeZone = this.settingsService.serverTimeZone;
  thereAreSelectedIssues = this.service.thereAreSelectedIssues;
  allResultsSelected = this.service.allResultsSelected;
  numberOfSelectedIssues = this.service.numberOfSelectedIssues;
  activeOrganizationProjects =
    this.organizationsService.activeOrganizationProjects;
  activeOrganization = this.organizationsService.activeOrganization;
  // errors = this.service.errors;
  sorts = [
    { param: "-last_seen", display: $localize`Most recent` },
    { param: "first_seen", display: $localize`Oldest first` },
    { param: "-count", display: $localize`Happens most` },
    { param: "count", display: $localize`Happens least` },
    { param: "-priority", display: $localize`Highest priority` },
    { param: "priority", display: $localize`Lowest priority` },
  ];

  /** Status tabs. Each maps onto an `is:` token in the search query. */
  readonly statusTabs: { value: IssueStatus | "all"; label: string }[] = [
    { value: "unresolved", label: $localize`Open` },
    { value: "resolved", label: $localize`Fixed` },
    { value: "ignored", label: $localize`Muted` },
    { value: "all", label: $localize`All` },
  ];
  readonly allLabel = $localize`All`;
  readonly last24Label = $localize`Last 24 hours`;
  readonly last14Label = $localize`Last 14 days`;

  private readonly fullQuery = computed(() => this.query() ?? "is:unresolved");
  activeStatus = computed<IssueStatus | "all">(() => {
    const match = this.fullQuery().match(/(?:^|\s)is:(unresolved|resolved|ignored)\b/);
    return (match?.[1] as IssueStatus | undefined) ?? "all";
  });
  /** The query without its status token; what the search box shows. */
  private searchText = computed(() =>
    this.fullQuery()
      .replace(/(?:^|\s)is:(unresolved|resolved|ignored)\b/g, " ")
      .trim(),
  );
  statusWord = computed(() => {
    switch (this.activeStatus()) {
      case "unresolved":
        return $localize`open`;
      case "resolved":
        return $localize`fixed`;
      case "ignored":
        return $localize`muted`;
      default:
        return "";
    }
  });
  summaryCount = computed(
    () => this.paginator()?.hits ?? this.issues().length,
  );
  newestSeen = computed(() => {
    const seen = this.issues().map((issue) => issue.lastSeen);
    return seen.length ? seen.reduce((a, b) => (a > b ? a : b)) : null;
  });
  sortLabel = computed(() => {
    const sort = this.sort() ?? "-last_seen";
    return this.sorts.find((s) => s.param === sort)?.display ?? sort;
  });

  readonly searchHelp: SearchHelpConfig = {
    heading: $localize`Search syntax`,
    sections: [
      {
        title: $localize`Status`,
        examples: ["is:unresolved", "is:resolved", "is:ignored"],
        mutuallyExclusive: true,
      },
      {
        title: $localize`Level`,
        examples: [
          "level:fatal",
          "level:error",
          "level:warning",
          "level:info",
          "level:debug",
          "level:sample",
        ],
        mutuallyExclusive: true,
      },
      {
        title: $localize`Tags`,
        samples: ["key:value"],
        note: $localize`Any tag works, e.g. environment:production or release:v1.2.0. One value per key.`,
      },
      {
        title: $localize`Text (must come last)`,
        samples: ["word", "prefix*"],
        note: $localize`Whole words by default. Add * for a prefix match. Anything after the first plain word becomes part of the text search, so put filters first.`,
      },
    ],
    footer: $localize`Tokens combine with a space (AND). There is no OR.`,
  };

  /**
   * Corresponds to project picker/header nav/project IDs in the URL
   * If the count is zero, we show issues from all projects
   */
  appliedProjectCount = computed(() => this.projects().length);

  showBulkSelectProject = computed(() => {
    const searchHits = this.paginator()?.hits;

    const hits = searchHits && this.numberOfSelectedIssues() < searchHits;
    if (this.areAllSelected() && hits) {
      return true;
    }
    return false;
  });

  availableEnvironments = computed(() =>
    this.#environmentsService.environmentNames(),
  );

  constructor() {
    effect(() => {
      this.service.updateParams({
        orgSlug: this.orgSlug(),
        cursor: this.cursor(),
        query: this.query() ?? "is:unresolved",
        start: this.start(),
        end: this.end(),
        sort: this.sort(),
        project: this.projects(),
        environment: this.environment(),
      });
    });
    effect(() => {
      const projects = this.projects();
      if (projects.length == 1) {
        const project = this.activeOrganizationProjects().find(
          (proj) => proj.id === projects[0],
        );
        if (project?.slug) {
          this.#environmentsService.projectSlug.set(project.slug);
        } else {
          this.#environmentsService.projectSlug.set(null);
        }
      } else {
        this.#environmentsService.projectSlug.set(null);
      }
    });
    /**
     * When changing from one project to another, see if there is an environment
     * in the URL. If it doesn't match a project environment, reset the URL.
     */
    effect(() => {
      const project = this.projects();
      const environment = this.environment();
      const environments = this.availableEnvironments();
      if (
        project.length &&
        this.#environmentsService.hasValue() &&
        environment &&
        !environments.includes(environment)
      ) {
        this.router.navigate([], {
          queryParams: { environment: null },
          queryParamsHandling: "merge",
        });
      }
    });
    effect(() => {
      this.form.setValue({ query: this.searchText() });
    });
    // Ensure sticky headers stay properly aligned
    // After showing/hiding headers based on whether or
    // not there are issue query results
    effect(() => {
      this.issues();
      if (this.table) {
        this.table.updateStickyHeaderRowStyles();
      }
    });
    effect(() => {
      const breakPointResult = this.breakPointSignal();
      if (breakPointResult?.matches) {
        this.displayedColumns.set(this.mediumScreenColumns);
        if (breakPointResult.breakpoints[Breakpoints.XSmall]) {
          this.displayedColumns.set(this.xSmallScreenColumns);
        }
        this.isLargeScreen.set(false);
      } else {
        this.displayedColumns.set(this.allColumns);
        this.isLargeScreen.set(true);
      }
    });
  }

  ngOnInit(): void {
    this.#environmentsService.reload();
  }

  ngOnDestroy(): void {
    this.#environmentsService.projectSlug.set(null);
  }

  trackIssues(index: number, issue: { id: string }): string {
    return issue.id;
  }

  private navigateQuery(status: IssueStatus | "all", text: string) {
    const query = [status === "all" ? "" : `is:${status}`, text.trim()]
      .filter(Boolean)
      .join(" ");
    this.router.navigate([], {
      queryParams: { query, cursor: null },
      queryParamsHandling: "merge",
    });
  }

  searchSubmit() {
    this.navigateQuery(this.activeStatus(), this.form.value.query ?? "");
  }

  setStatus(status: IssueStatus | "all") {
    this.navigateQuery(status, this.searchText());
  }

  setEnvironment(environment: string | null) {
    this.router.navigate([], {
      queryParams: { cursor: null, environment },
      queryParamsHandling: "merge",
    });
  }

  setSort(sort: string) {
    this.router.navigate([], {
      queryParams: { cursor: null, sort },
      queryParamsHandling: "merge",
    });
  }

  /** Mark one issue fixed, muted or open again from its row. */
  setIssueStatus(issueId: string, status: IssueStatus) {
    this.service.updateStatusForIssues(this.orgSlug(), [issueId], status);
  }

  /** Error type and message, e.g. "TypeError" and "x is undefined". */
  headline(issue: Issue): { type: string; message: string } {
    const { type, value } = issue.metadata ?? {};
    if (type && value) {
      return { type, message: value };
    }
    return { type: issue.title, message: "" };
  }

  /** First seen within the last day. */
  isNew(issue: Issue) {
    return Date.now() - new Date(issue.firstSeen).getTime() < 86_400_000;
  }

  /** Dot color for a level. The level is also read out as text. */
  levelTone(level: string) {
    switch (level) {
      case "fatal":
      case "error":
        return "error";
      case "warning":
        return "warning";
      default:
        return "neutral";
    }
  }

  updateStatus(status: IssueStatus) {
    const allResultsSelected = this.allResultsSelected();
    const orgSlug = this.orgSlug();
    if (orgSlug) {
      if (allResultsSelected) {
        this.service.bulkUpdateStatus(
          status,
          orgSlug,
          this.projects(),
          this.query(),
          this.start(),
          this.end(),
          this.environment(),
        );
      } else {
        this.service.updateStatusByIssueId(orgSlug, status);
      }
    }
  }

  mergeSelectedIssues() {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: $localize`Merge issues?`,
        message: $localize`This action will merge your selected issues into a single issue.`,
        confirmText: $localize`Merge`,
        destructive: false,
      },
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      const orgSlug = this.orgSlug();
      if (confirmed && orgSlug) {
        this.service.updateStatusByIssueId(orgSlug, "merge");
      }
    });
  }

  deleteSelectedIssues() {
    const allResultsSelected = this.allResultsSelected();
    const count = allResultsSelected
      ? (this.paginator()?.hits ?? this.numberOfSelectedIssues())
      : this.numberOfSelectedIssues();

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: $localize`Delete issues?`,
        message: $localize`Are you sure you want to delete ${count} issue(s)? You will permanently lose these issues and all associated events.`,
        confirmText: $localize`Delete`,
      },
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      const orgSlug = this.orgSlug();
      if (confirmed && orgSlug) {
        if (allResultsSelected) {
          this.service.bulkDeleteIssues(
            orgSlug,
            this.projects(),
            this.query(),
            this.start(),
            this.end(),
            this.environment(),
          );
        } else {
          this.service.deleteIssuesByIds(orgSlug);
        }
      }
    });
  }

  toggleCheck(event: MouseEvent, issueId: number) {
    event.preventDefault();
    const issueIdStr = issueId.toString();

    if (event.shiftKey && this.lastClickedIssueId() !== null) {
      const issues = this.issues();
      const lastIndex = issues.findIndex(
        (i) => i.id.toString() === this.lastClickedIssueId(),
      );
      const currentIndex = issues.findIndex(
        (i) => i.id.toString() === issueIdStr,
      );

      if (lastIndex !== -1 && currentIndex !== -1) {
        const start = Math.min(lastIndex, currentIndex);
        const end = Math.max(lastIndex, currentIndex);
        const idsInRange = issues
          .slice(start, end + 1)
          .map((i) => i.id.toString());
        if (issues[currentIndex].isSelected) {
          this.service.deselectRange(idsInRange);
        } else {
          this.service.selectRange(idsInRange);
        }
      } else {
        this.service.toggleSelectOne(issueIdStr);
      }
    } else {
      this.service.toggleSelectOne(issueIdStr);
    }

    this.lastClickedIssueId.set(issueIdStr);
  }

  toggleSelectAllOnPage() {
    this.service.toggleSelectAllOnPage();
  }

  selectAllResults() {
    this.service.selectAllResults();
  }

  clearSelectAllResults() {
    this.service.cancelAllResultsSelection();
  }

  toggleStatsPeriod(period: "24h" | "14d") {
    this.statsPeriod.set(period);
  }
}
