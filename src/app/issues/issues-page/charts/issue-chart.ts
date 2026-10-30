import {
  Component,
  ChangeDetectionStrategy,
  input,
  computed,
  inject,
  LOCALE_ID,
} from "@angular/core";
import { formatDate } from "@angular/common";
import {
  FormattedStatsDataPoint,
  StatsDataPointBase,
  StatsPeriod,
} from "../../interfaces";

@Component({
  selector: "gt-issue-chart",
  standalone: true,
  templateUrl: "./issue-chart.html",
  styleUrl: "./issue-chart.scss",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IssueChart {
  private locale = inject(LOCALE_ID);

  formattedStats = input.required<FormattedStatsDataPoint[]>();
  statsChartDataFrame = input.required<StatsDataPointBase[]>();
  statsPeriod = input.required<StatsPeriod>();
  serverTimeZone = input.required<string | undefined>();
  loading = input.required<boolean>();

  bars = computed(() => {
    const data = this.formattedStats();
    const max = Math.max(...data.map((d) => d.value), 0);
    const daily = this.statsPeriod() === "14d";
    return data.map((d) => ({
      name: d.name,
      // Daily stats count from midnight in the server's time zone, so the
      // day is shown in that zone rather than the viewer's.
      label: `${formatDate(
        d.timestamp,
        daily ? "M/d/yy" : "M/d/yy, h:mm a",
        this.locale,
        daily ? this.serverTimeZone() : undefined,
      )}: ${d.value}`,
      height: max ? (d.value / max) * 100 : 0,
      peak: max > 0 && d.value === max,
    }));
  });

  summary = computed(() => {
    const total = this.formattedStats().reduce((sum, d) => sum + d.value, 0);
    return this.statsPeriod() === "14d"
      ? $localize`${total} events in the last 14 days`
      : $localize`${total} events in the last 24 hours`;
  });
}
