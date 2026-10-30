import { Component, ChangeDetectionStrategy, input } from "@angular/core";
import { RouterLink } from "@angular/router";
import { MatButtonModule } from "@angular/material/button";

@Component({
  selector: "gt-empty-projects",
  imports: [RouterLink, MatButtonModule],
  templateUrl: "./empty-projects.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmptyProjectsComponent {
  readonly activeOrgOnly = input(false);
  readonly canCreateProject = input(true);
  readonly orgSlug = input<string>();
}
