import {
  Component,
  ChangeDetectionStrategy,
  HostListener,
  inject,
  computed,
  signal,
} from "@angular/core";
import { MainNavService } from "../main-nav.service";
import { SettingsService } from "src/app/api/settings.service";
import { UserService } from "src/app/api/user/user.service";
import { MobileNavToolbarComponent } from "../../mobile-nav-toolbar/mobile-nav-toolbar.component";
import { SupportMenuComponent } from "../support-menu/support-menu.component";
import { MatDialog } from "@angular/material/dialog";
import { MatDividerModule } from "@angular/material/divider";
import { MatButtonModule } from "@angular/material/button";
import { MatIconModule } from "@angular/material/icon";
import { RouterLink, RouterLinkActive } from "@angular/router";
import { MatSidenavModule } from "@angular/material/sidenav";
import { MatMenuModule } from "@angular/material/menu";
import { MatTooltipModule } from "@angular/material/tooltip";
import { AuthService } from "src/app/auth.service";
import { OrganizationsService } from "src/app/api/organizations.service";
import { JumpTarget, JumpToComponent } from "../jump-to/jump-to.component";

interface NavItem {
  name: string;
  icon: string;
  route: string[];
  requiresFeature?: string;
  exactRoute?: boolean;
}

@Component({
  selector: "gt-main-nav",
  templateUrl: "./main-nav.component.html",
  styleUrls: ["./main-nav.component.scss"],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatSidenavModule,
    MatIconModule,
    RouterLink,
    MatButtonModule,
    MatDividerModule,
    MatMenuModule,
    MatTooltipModule,
    RouterLinkActive,
    MobileNavToolbarComponent,
    SupportMenuComponent,
  ],
})
export class MainNavComponent {
  private mainNav = inject(MainNavService);
  private organizationsService = inject(OrganizationsService);
  private auth = inject(AuthService);
  private settingsService = inject(SettingsService);
  private userService = inject(UserService);
  private dialog = inject(MatDialog);

  readonly collapseLabel = $localize`Collapse sidebar`;
  readonly expandLabel = $localize`Expand sidebar`;
  readonly jumpLabel = $localize`Jump to a page or project`;
  readonly jumpShortcut = /Mac|iPhone|iPad/.test(globalThis.navigator?.platform ?? "")
    ? "⌘K"
    : "Ctrl K";

  navItems: NavItem[] = [
    {
      name: $localize`Issues`,
      icon: "breaking_news",
      route: ["org_slug", "issues"],
    },
    {
      name: $localize`Uptime Monitors`,
      icon: "share_eta",
      route: ["org_slug", "uptime-monitors"],
      requiresFeature: "uptime",
    },
    {
      name: $localize`Performance`,
      icon: "avg_pace",
      route: ["org_slug", "performance"],
    },
    {
      name: $localize`Logs`,
      icon: "text_snippet",
      route: ["org_slug", "logs"],
      requiresFeature: "logs",
    },
    {
      name: $localize`Projects`,
      icon: "team_dashboard",
      route: ["org_slug", "projects"],
    },
    {
      name: $localize`Releases`,
      icon: "rocket_launch",
      route: ["org_slug", "releases"],
    },
  ];

  orgMenuItems: NavItem[] = [
    {
      name: $localize`General settings`,
      icon: "settings",
      route: ["org_slug", "settings"],
      exactRoute: true,
    },
    {
      name: $localize`Projects`,
      icon: "folder",
      route: ["org_slug", "settings", "projects"],
    },
    {
      name: $localize`Subscription`,
      icon: "payment",
      route: ["org_slug", "settings", "subscription"],
    },
    {
      name: $localize`Teams`,
      icon: "groups",
      route: ["org_slug", "settings", "teams"],
    },
    {
      name: $localize`Members`,
      icon: "people",
      route: ["org_slug", "settings", "members"],
    },
  ];

  profileMenuItems: NavItem[] = [
    {
      name: $localize`Account`,
      icon: "person",
      route: ["/profile"],
      exactRoute: true,
    },
    {
      name: $localize`MFA`,
      icon: "security",
      route: ["/profile", "multi-factor-auth"],
    },
    {
      name: $localize`Notifications`,
      icon: "notifications",
      route: ["/profile", "notifications"],
    },
    {
      name: $localize`Auth Tokens`,
      icon: "vpn_key",
      route: ["/profile", "auth-tokens"],
    },
  ];

  visibleNavItems = computed(() => {
    const enabledFeatures = this.settingsService.enabledFeatures();
    return this.navItems.filter(
      (node) =>
        !node.requiresFeature || enabledFeatures.includes(node.requiresFeature),
    );
  });

  visibleOrgMenuItems = this.orgMenuItems;

  isCollapsed = signal(false);

  getRouteWithOrgSlug(route: string[]) {
    return route.map((item) =>
      item === "org_slug" ? this.activeOrganizationSlug() : item,
    );
  }

  activeOrganizationSlug = this.organizationsService.activeOrganizationSlug;
  activeOrganization = this.organizationsService.activeOrganization;
  organizations = this.organizationsService.organizations;
  organizationsInitialLoad = this.organizationsService.initialLoad;
  isLoggedIn = this.auth.isAuthenticated;
  navOpen = this.mainNav.navOpen;
  paidForGlitchTip = this.settingsService.paidForGlitchTip;
  mobileNav = this.mainNav.mobileNav;
  version = this.settingsService.version;
  userEmail = computed(() => this.userService.user()?.email ?? "");
  projectCount = this.organizationsService.projectsCount;

  contextLoaded = computed(
    () =>
      this.settingsService.initialLoad() &&
      this.organizationsInitialLoad() &&
      !!this.userService.user(),
  );

  canCreateOrg = computed(
    () =>
      this.settingsService.enableOrganizationCreation() ||
      this.userService.user() ||
      this.organizationsService.organizationsCount(),
  );

  async logout() {
    await this.auth.logout();
    window.location.href = "/login";
  }

  private dispatchResizeEvent() {
    window.dispatchEvent(new Event("resize"));
  }

  toggleSideNav() {
    this.mainNav.getToggleNav();
  }

  toggleCollapse() {
    this.isCollapsed.update((val) => !val);
    this.dispatchResizeEvent();
  }

  closeSideNav() {
    this.mainNav.getClosedNav();
    if (this.isCollapsed()) {
      this.isCollapsed.set(false);
      this.dispatchResizeEvent();
    }
  }

  selectOrganization(slug: string) {
    this.organizationsService.setActiveOrganizationSlug(slug);
  }

  /** First letter for an avatar, e.g. "acme" → "A". */
  initial(name: string | null | undefined) {
    return (name ?? "").trim().charAt(0).toUpperCase() || "?";
  }

  @HostListener("document:keydown", ["$event"])
  onKeydown(event: KeyboardEvent) {
    if (
      (event.metaKey || event.ctrlKey) &&
      event.key.toLowerCase() === "k" &&
      this.isLoggedIn()
    ) {
      event.preventDefault();
      this.openJumpTo();
    }
  }

  openJumpTo() {
    if (this.dialog.getDialogById("jump-to")) {
      return;
    }
    const pages: JumpTarget[] = this.visibleNavItems().map((item) => ({
      label: item.name,
      kind: $localize`Page`,
      icon: item.icon,
      route: this.getRouteWithOrgSlug(item.route),
    }));
    const settings: JumpTarget[] = this.orgMenuItems.map((item) => ({
      label: item.name,
      kind: $localize`Settings`,
      icon: item.icon,
      route: this.getRouteWithOrgSlug(item.route),
    }));
    const projects: JumpTarget[] = this.organizationsService
      .activeOrganizationProjects()
      .map((project) => ({
        label: project.name,
        kind: $localize`Project`,
        icon: "folder",
        route: [this.activeOrganizationSlug(), "issues"],
        queryParams: { project: String(project.id) },
      }));
    const account: JumpTarget[] = this.profileMenuItems.map((item) => ({
      label: item.name,
      kind: $localize`Account`,
      icon: item.icon,
      route: item.route,
    }));
    this.dialog.open(JumpToComponent, {
      id: "jump-to",
      data: this.activeOrganization()
        ? [...pages, ...projects, ...settings, ...account]
        : account,
      position: { top: "12vh" },
      maxWidth: "calc(100vw - 32px)",
      autoFocus: "input",
      panelClass: "cn-jump-panel",
    });
  }

  reload() {
    this.settingsService.reload();
    this.userService.reload();
    this.organizationsService.reload();
  }
}
