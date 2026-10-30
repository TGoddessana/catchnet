import {
  Component,
  OnInit,
  ChangeDetectionStrategy,
  Input,
  computed,
  inject,
} from "@angular/core";
import { RouterModule } from "@angular/router";
import { MatButtonModule } from "@angular/material/button";
import { ProjectsService } from "src/app/projects/projects.service";
import { MatIconModule } from "@angular/material/icon";
import { ProjectTable } from "../project-table/project-table";
import { EmptyProjectsComponent } from "../project-card/empty-projects/empty-projects.component";
import { OrganizationsService } from "src/app/api/organizations.service";

@Component({
  selector: "gt-project-list",
  imports: [
    RouterModule,
    MatButtonModule,
    MatIconModule,
    EmptyProjectsComponent,
    ProjectTable,
  ],
  templateUrl: "./project-list.component.html",
  styleUrls: ["./project-list.component.scss"],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectListComponent implements OnInit {
  private organizationsService = inject(OrganizationsService);
  private projectsService = inject(ProjectsService);

  @Input() activeOrgOnly = false;

  activeOrganization = this.organizationsService.activeOrganization;
  projects = computed(() => this.projectsService.projects() || []);
  organizations = this.organizationsService.organizations;
  orgServiceInitialLoad = this.organizationsService.initialLoad;
  orgsAndProjects = computed(() =>
    this.organizations().map((organization) => ({
      ...organization,
      projects: this.projects().filter(
        (project) => project.organization.id.toString() === organization.id,
      ),
    })),
  );
  visibleOrgs = computed(() =>
    this.orgsAndProjects().filter(
      (org) => !this.activeOrgOnly || org.id === this.activeOrganization()?.id,
    ),
  );
  projectCount = computed(() =>
    this.visibleOrgs().reduce((n, org) => n + org.projects.length, 0),
  );
  // Scopes come from one selected org, so only the single-org view is gated.
  canWriteProject = this.organizationsService.canWriteProject;

  ngOnInit() {
    this.projectsService.retrieveProjects();
  }
}
