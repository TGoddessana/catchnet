import {
  Component,
  ChangeDetectionStrategy,
  inject,
  input,
  effect,
  computed,
} from "@angular/core";
import { ActivatedRoute, Router, RouterModule } from "@angular/router";
import { FormControl, FormGroup } from "@angular/forms";
import { MatButtonModule } from "@angular/material/button";
import { MatSelectChange } from "@angular/material/select";
import { MatIconModule } from "@angular/material/icon";
import { stringAttribute } from "src/app/shared/shared.utils";
import { TimeForPipe } from "src/app/shared/days-ago.pipe";
import { MonitorChartComponent } from "../monitor-chart/monitor-chart.component";
import {
  DEFAULT_MONITOR_SORT,
  MonitorListService,
  MonitorSort,
  monitorSorts,
  toMonitorSort,
} from "./monitor-list.service";
import { DataFilterBarComponent } from "src/app/list-elements/data-filter-bar/data-filter-bar.component";
import { PaginationButtons } from "src/app/list-elements/pagination-buttons/pagination-buttons";
import { LoadingOverlayComponent } from "src/app/shared/loading-overlay/loading-overlay.component";
import { OrganizationsService } from "src/app/api/organizations.service";

@Component({
  selector: "gt-monitor-list",
  templateUrl: "./monitor-list.component.html",
  styleUrls: ["./monitor-list.component.scss"],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterModule,
    TimeForPipe,
    MonitorChartComponent,
    MatButtonModule,
    MatIconModule,
    DataFilterBarComponent,
    PaginationButtons,
    LoadingOverlayComponent,
  ],
  providers: [MonitorListService],
})
export class MonitorListComponent {
  protected route = inject(ActivatedRoute);
  protected router = inject(Router);
  service = inject(MonitorListService);
  private organizationsService = inject(OrganizationsService);
  cursor = input(undefined, { transform: stringAttribute });
  sort = input(undefined, { transform: stringAttribute });

  monitors = this.service.monitors;
  paginator = this.service.paginator;
  loading = this.service.loading;
  initialLoadComplete = this.service.initialLoadComplete;
  errors = this.service.errors;
  canWriteProject = this.organizationsService.canWriteProject;
  hasError = this.service.hasError;
  downCount = computed(
    () => (this.monitors() ?? []).filter((m) => m.isUp === false).length,
  );
  sorts = monitorSorts;
  sortForm = new FormGroup({
    sort: new FormControl<MonitorSort>(DEFAULT_MONITOR_SORT),
  });

  constructor() {
    effect(() => {
      this.service.cursor.set(this.cursor());
    });
    effect(() => {
      const sort = toMonitorSort(this.sort());
      this.service.sort.set(sort);
      this.sortForm.setValue({ sort });
    });
  }

  sortByChanged(event: MatSelectChange) {
    // Drop the cursor: a page position from the old order means nothing here.
    this.router.navigate([], {
      queryParams: { cursor: null, sort: event.value },
      queryParamsHandling: "merge",
    });
  }
}
