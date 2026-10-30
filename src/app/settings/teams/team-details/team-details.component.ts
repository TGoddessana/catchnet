import { Component, input, ChangeDetectionStrategy } from "@angular/core";
import { RouterLink, RouterLinkActive, RouterOutlet } from "@angular/router";
import { MatTabsModule } from "@angular/material/tabs";
import { MatIconModule } from "@angular/material/icon";
import { MatButtonModule } from "@angular/material/button";

@Component({
  templateUrl: "./team-details.component.html",
  styleUrls: ["./team-details.component.scss"],
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [
    MatButtonModule,
    RouterLink,
    MatIconModule,
    MatTabsModule,
    RouterLinkActive,
    RouterOutlet,
  ],
})
export class TeamDetailsComponent {
  orgSlug = input.required<string>({ alias: "org-slug" });
  teamSlug = input.required<string>({ alias: "team-slug" });
  navLinks = [
    {
      path: "members",
      label: $localize`Members`,
    },
    {
      path: "projects",
      label: $localize`Projects`,
    },
    {
      path: "settings",
      label: $localize`Settings`,
    },
  ];
}
