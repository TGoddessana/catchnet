import { MatIconModule } from "@angular/material/icon";
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
} from "@angular/core";
import { TeamsService } from "src/app/api/teams/teams.service";
import { RouterLink } from "@angular/router";
import { MatDialog, MatDialogModule } from "@angular/material/dialog";
import { NewTeamComponent } from "./new-team/new-team";
import { OrganizationDetailService } from "src/app/api/organizations/organization-detail.service";
import { LoadingButtonComponent } from "../../shared/loading-button/loading-button.component";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatButtonModule } from "@angular/material/button";
import { OrganizationsService } from "src/app/api/organizations.service";

@Component({
  selector: "gt-teams",
  templateUrl: "./teams.component.html",
  styleUrls: ["./teams.component.scss"],
  imports: [
    MatIconModule,
    MatButtonModule,
    MatDialogModule,
    RouterLink,
    MatFormFieldModule,
    LoadingButtonComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeamsComponent {
  private teamsService = inject(TeamsService);
  private organizationsService = inject(OrganizationsService);
  private organizationDetailService = inject(OrganizationDetailService);
  dialog = inject(MatDialog);

  orgSlug = input.required<string>({ alias: "org-slug" });
  activeOrganization = this.organizationsService.activeOrganization;
  yourTeams = computed(() =>
    this.activeOrganization()?.teams.filter((team) => team.isMember),
  );
  otherTeams = computed(() =>
    this.activeOrganization()?.teams.filter((team) => !team.isMember),
  );
  errors = this.organizationDetailService.errors;
  loading = this.organizationDetailService.loading;
  canWriteTeam = this.organizationsService.canWriteTeam;
  // Mirrors the backend: open membership lets anyone join or leave; otherwise
  // joining needs Manager+ (org:write) and leaving needs Admin+ (team:write).
  #openMembership = computed(
    () => this.activeOrganization()?.openMembership ?? false,
  );
  canJoinTeam = computed(
    () => this.#openMembership() || this.organizationsService.canWriteOrg(),
  );
  canLeaveTeam = computed(
    () => this.#openMembership() || this.organizationsService.canWriteTeam(),
  );


  constructor() {
    effect(() => {
      this.teamsService.setTeamsOrgSlug(this.orgSlug());
    });
  }

  openCreateTeamDialog() {
    this.dialog.open(NewTeamComponent, {
      maxWidth: "500px",
      data: {
        orgSlug: this.orgSlug(),
      },
    });
  }

  leaveTeam(team: string) {
    this.organizationDetailService.leaveTeam(team);
  }

  joinTeam(team: string) {
    this.organizationDetailService.joinTeam(team);
  }
}
