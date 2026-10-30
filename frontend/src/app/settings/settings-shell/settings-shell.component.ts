import { ChangeDetectionStrategy, Component } from "@angular/core";
import { RouterLink, RouterLinkActive, RouterOutlet } from "@angular/router";

/**
 * Wraps the organization settings pages with one section nav, so every
 * settings page can be reached from every other.
 */
@Component({
  selector: "gt-settings-shell",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  template: `
    <nav class="cn-settings-nav" i18n-aria-label aria-label="Settings sections">
      <div class="cn-segmented">
        @for (section of sections; track section.route) {
          <a
            class="cn-segmented__item"
            [routerLink]="section.route"
            routerLinkActive="is-selected"
            ariaCurrentWhenActive="page"
            [routerLinkActiveOptions]="{ exact: section.exact }"
            >{{ section.label }}</a
          >
        }
      </div>
    </nav>
    <router-outlet />
  `,
  styles: `
    .cn-settings-nav {
      max-width: 1280px;
      margin: 0 auto;
      padding: 20px 32px 0;
    }
    .cn-segmented__item {
      text-decoration: none;
    }
    @media (max-width: 599px) {
      .cn-settings-nav {
        padding: 12px 16px 0;
      }
    }
  `,
})
export class SettingsShellComponent {
  readonly sections = [
    { label: $localize`General`, route: "./", exact: true },
    { label: $localize`Projects`, route: "projects", exact: false },
    { label: $localize`Members`, route: "members", exact: false },
    { label: $localize`Teams`, route: "teams", exact: false },
    { label: $localize`Subscription`, route: "subscription", exact: false },
  ];
}
