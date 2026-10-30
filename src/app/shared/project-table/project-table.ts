import {
  ChangeDetectionStrategy,
  Component,
  effect,
  input,
  signal,
} from "@angular/core";
import { DatePipe } from "@angular/common";
import { RouterLink } from "@angular/router";
import { MatTooltipModule } from "@angular/material/tooltip";
import { client } from "../api/api";
import { getPaginationHeaders } from "../pagination.utils";
import { DaysAgoPipe } from "../days-ago.pipe";

export interface ProjectTableRow {
  id: string | number;
  name: string;
  slug?: string | null;
  platform?: string | null;
  dateCreated: string;
  isMember: boolean;
}

interface ProjectActivity {
  openIssues: number;
  latest: string | null;
}

/** Above this many rows the per-project issue counts are not fetched. */
const ACTIVITY_LIMIT = 50;

/**
 * The one projects table used on the home screen, the Projects screen and
 * Settings > Projects. Each row answers "is this project sending errors?"
 * with its open issue count and when the latest one happened.
 */
@Component({
  selector: "gt-project-table",
  templateUrl: "./project-table.html",
  styleUrl: "./project-table.scss",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, DatePipe, DaysAgoPipe, MatTooltipModule],
})
export class ProjectTable {
  projects = input.required<ProjectTableRow[]>();
  orgSlug = input.required<string>();

  protected activity = signal<Record<string, ProjectActivity | null>>({});
  protected notMemberTooltip = $localize`Join one of this project's teams to see its issues`;

  constructor() {
    effect(() => {
      const projects = this.projects();
      const orgSlug = this.orgSlug();
      if (projects.length > ACTIVITY_LIMIT) {
        return;
      }
      for (const project of projects) {
        if (project.isMember && !(project.id in this.activity())) {
          this.loadActivity(orgSlug, project.id);
        }
      }
    });
  }

  private async loadActivity(orgSlug: string, projectId: string | number) {
    this.activity.update((a) => ({ ...a, [projectId]: null }));
    const { data, response, error } = await client.GET(
      "/api/0/organizations/{organization_id_or_slug}/issues/",
      {
        params: {
          path: { organization_id_or_slug: orgSlug },
          query: { project: [Number(projectId)], query: "is:unresolved" },
        },
      },
    );
    if (error || !data) {
      return;
    }
    this.activity.update((a) => ({
      ...a,
      [projectId]: {
        openIssues: getPaginationHeaders(response).hits,
        latest: data[0]?.lastSeen ?? null,
      },
    }));
  }

  platformName(platform: string | null | undefined) {
    if (!platform) {
      return null;
    }
    const name = platform.split("-")[0];
    return name.charAt(0).toUpperCase() + name.slice(1);
  }
}
