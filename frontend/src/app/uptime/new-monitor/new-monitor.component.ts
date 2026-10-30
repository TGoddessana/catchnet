import { Component, ChangeDetectionStrategy, inject } from "@angular/core";
import { RouterModule } from "@angular/router";
import { MatButtonModule } from "@angular/material/button";
import { MatIconModule } from "@angular/material/icon";
import { MonitorFormComponent } from "../monitor-form/monitor-form.component";
import { MonitorInput } from "../uptime.interfaces";
import { MonitorService } from "../monitor.service";

@Component({
  selector: "gt-new-monitor",
  templateUrl: "./new-monitor.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterModule, MonitorFormComponent, MatButtonModule, MatIconModule],
})
export class NewMonitorComponent {
  private monitorService = inject(MonitorService);

  error = this.monitorService.error;
  loading = this.monitorService.createLoading;

  submit(formValues: MonitorInput) {
    this.monitorService.createMonitor(formValues);
  }
}
