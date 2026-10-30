import { Component, inject, ChangeDetectionStrategy } from "@angular/core";
import { RouterLink, RouterLinkActive, RouterOutlet } from "@angular/router";
import { UserService } from "../api/user/user.service";

@Component({
  selector: "gt-profile",
  templateUrl: "./profile-wrapper.component.html",
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  styles: `
    .cn-account__tabs {
      margin-bottom: var(--gt-space-6);
    }
    .cn-segmented__item {
      text-decoration: none;
    }
  `,
})
export class ProfilWrapperComponent {
  private userService = inject(UserService);
  user = this.userService.user;

  readonly sections = [
    { label: $localize`Account`, route: "/profile", exact: true },
    {
      label: $localize`Auth tokens`,
      route: "/profile/auth-tokens",
      exact: false,
    },
    {
      label: $localize`Notifications`,
      route: "/profile/notifications",
      exact: false,
    },
    {
      label: $localize`Two-factor auth`,
      route: "/profile/multi-factor-auth",
      exact: false,
    },
  ];
}
