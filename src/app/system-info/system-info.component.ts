import { ChangeDetectionStrategy, Component, inject } from "@angular/core";
import { SettingsService } from "../api/settings.service";
import { MarkdownComponent, provideMarkdown } from "ngx-markdown";

@Component({
  selector: "gt-system-info",
  imports: [MarkdownComponent],
  providers: [provideMarkdown()],
  templateUrl: "./system-info.component.html",
  styleUrls: ["./system-info.component.scss"],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SystemInfoComponent {
  private settingsService = inject(SettingsService);

  enableOrganizationCreate = this.settingsService.enableOrganizationCreation;
  enableUserRegistration = this.settingsService.enableUserRegistration;
  serverTimeZone = this.settingsService.serverTimeZone;
  version = this.settingsService.version;
  instanceName = this.settingsService.instanceName;
}
