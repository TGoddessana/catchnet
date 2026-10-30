import { Injectable, inject } from "@angular/core";
import { OrganizationsService } from "./organizations.service";
import { client } from "../shared/api/api";
import type { components } from "./api-schema";

export type FixAttempt = components["schemas"]["FixAttemptSchema"];
export type AutofixSettings = components["schemas"]["AutofixSettingsSchema"];
export type AutofixSettingsIn = components["schemas"]["AutofixSettingsIn"];
export type FixUsage = components["schemas"]["FixUsageSchema"];

export type FixStatus =
  | "queued"
  | "triaging"
  | "running"
  | "pr_opened"
  | "no_fix"
  | "failed"
  | "merged"
  | "closed";

/** How each fix state reads everywhere it shows: the issue panel, the
 * issue list badge and the fixes page share these words and tones. */
export const FIX_STATUS: Record<
  FixStatus,
  {
    label: string;
    tone: "accent" | "success" | "neutral" | "warning";
    busy?: boolean;
  }
> = {
  queued: { label: $localize`Waiting to start`, tone: "accent", busy: true },
  triaging: { label: $localize`Reading the error`, tone: "accent", busy: true },
  running: { label: $localize`Writing a fix`, tone: "accent", busy: true },
  pr_opened: { label: $localize`Fix ready for review`, tone: "success" },
  merged: { label: $localize`Fix merged`, tone: "success" },
  closed: { label: $localize`Fix declined`, tone: "neutral" },
  no_fix: { label: $localize`No fix suggested`, tone: "neutral" },
  failed: { label: $localize`Fix run stopped`, tone: "warning" },
};

export function fixStatus(status: string) {
  return FIX_STATUS[status as FixStatus] ?? FIX_STATUS.failed;
}

@Injectable({ providedIn: "root" })
export class AutofixService {
  private organizationsService = inject(OrganizationsService);

  private org(orgSlug: string) {
    return this.organizationsService.orgPath(orgSlug);
  }

  async getSettings(orgSlug: string, projectSlug: string) {
    const { data, error } = await client.GET(
      "/api/0/projects/{organization_id_or_slug}/{project_slug}/autofix/",
      { params: { path: { ...this.org(orgSlug), project_slug: projectSlug } } },
    );
    if (error) throw error;
    return data;
  }

  async saveSettings(
    orgSlug: string,
    projectSlug: string,
    body: AutofixSettingsIn,
  ) {
    const { data, error } = await client.PUT(
      "/api/0/projects/{organization_id_or_slug}/{project_slug}/autofix/",
      {
        params: { path: { ...this.org(orgSlug), project_slug: projectSlug } },
        body,
      },
    );
    if (error) throw error;
    return data;
  }

  async listIssueFixes(orgSlug: string, issueId: number) {
    const { data, error } = await client.GET(
      "/api/0/organizations/{organization_id_or_slug}/issues/{issue_id}/fixes/",
      { params: { path: { ...this.org(orgSlug), issue_id: issueId } } },
    );
    if (error) throw error;
    return data;
  }

  async requestFix(orgSlug: string, issueId: number) {
    const { data, error } = await client.POST(
      "/api/0/organizations/{organization_id_or_slug}/issues/{issue_id}/fixes/",
      { params: { path: { ...this.org(orgSlug), issue_id: issueId } } },
    );
    if (error) throw error;
    return data;
  }

  /** The newest fix per issue, for status badges on a page of issues. */
  async latestFixes(orgSlug: string, issueIds: number[]) {
    if (issueIds.length === 0) return [];
    const { data, error } = await client.GET(
      "/api/0/organizations/{organization_id_or_slug}/fixes/",
      {
        params: {
          path: this.org(orgSlug),
          query: { issue: issueIds.join(","), limit: 100 },
        },
      },
    );
    if (error) throw error;
    return data;
  }

  async listFixes(orgSlug: string, limit = 50) {
    const { data, error } = await client.GET(
      "/api/0/organizations/{organization_id_or_slug}/fixes/",
      { params: { path: this.org(orgSlug), query: { limit } } },
    );
    if (error) throw error;
    return data;
  }

  async usage(orgSlug: string, days = 30) {
    const { data, error } = await client.GET(
      "/api/0/organizations/{organization_id_or_slug}/fixes/usage/",
      { params: { path: this.org(orgSlug), query: { days } } },
    );
    if (error) throw error;
    return data;
  }
}
