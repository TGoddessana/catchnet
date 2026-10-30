import {
  Component,
  ChangeDetectionStrategy,
  effect,
  inject,
  input,
} from "@angular/core";
import { EmptyProjectsComponent } from "../../shared/project-card/empty-projects/empty-projects.component";
import { RouterLink } from "@angular/router";
import { MatButtonModule } from "@angular/material/button";
import { MatIconModule } from "@angular/material/icon";
import { ProjectTable } from "../../shared/project-table/project-table";
import { SettingsProjectsService } from "./projects.service";
import { OrganizationsService } from "src/app/api/organizations.service";

@Component({
  templateUrl: "./projects.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatButtonModule,
    RouterLink,
    MatIconModule,
    EmptyProjectsComponent,
    ProjectTable,
  ],
  providers: [SettingsProjectsService],
})
export class ProjectsComponent {
  private service = inject(SettingsProjectsService);
  private organizationsService = inject(OrganizationsService);

  orgSlug = input.required<string>({ alias: "org-slug" });
  activeOrganization = this.organizationsService.activeOrganization;
  projects = this.service.projects;
  errors = this.service.errors;
  hasError = this.service.hasError;
  canWriteProject = this.organizationsService.canWriteProject;

  constructor() {
    effect(() => {
      this.service.orgSlug.set(this.orgSlug());
    });
  }
}
