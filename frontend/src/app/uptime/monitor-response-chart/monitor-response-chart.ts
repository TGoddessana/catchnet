import {
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  computed,
  input,
  signal,
  ChangeDetectionStrategy,
} from "@angular/core";
import { ResponseTimeSeries } from "../uptime.interfaces";
import { AreaChartComponent } from "@glitchtip/ng-charts";
import { DatePipe } from "@angular/common";

@Component({
  selector: "gt-monitor-response-chart",
  templateUrl: "./monitor-response-chart.html",
  styles: `
    :host {
      display: block;
    }
    .chart-container {
      height: 250px;
      width: 100%;
    }
    /* A 2px line over a faint fill, each series in its own status colour.
       The fill attribute ngx-charts writes is the only hook per series. */
    :host ::ng-deep path.area {
      fill-opacity: 0.14;
      stroke-width: 2px;
      stroke-linejoin: round;
    }
    :host ::ng-deep path.area[fill="#12a77a"] {
      stroke: #12a77a;
    }
    :host ::ng-deep path.area[fill="#e5604f"] {
      stroke: #e5604f;
    }
  `,
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [AreaChartComponent, DatePipe],
})
export class MonitorResponseChart implements OnDestroy {
  // Manages observation of the chart's container element for size changes.
  private resizeObserver?: ResizeObserver;
  private _containerRef?: ElementRef<HTMLDivElement>;

  data = input<ResponseTimeSeries[] | null | undefined>();
  scale = input<{
    yScaleMin: number;
    yScaleMax: number;
    xScaleMin: Date;
  }>();

  chartData = computed(() => {
    const currentData = this.data();
    if (!currentData) {
      return [];
    }

    return currentData.map((series) => {
      if (series.series.length === 1) {
        const originalPoint = series.series[0];
        const phantomPoint = {
          name: new Date(originalPoint.name.getTime() + 2000),
          value: originalPoint.value,
        };
        return {
          ...series,
          series: [originalPoint, phantomPoint],
        };
      }
      return series;
    });
  });

  view = signal<[number, number]>([0, 250]);
  // The status dot colours (--gt-color-success-dot, --gt-color-error-dot).
  // ngx-charts writes these into SVG fill attributes, which cannot read CSS
  // custom properties, so they are repeated here as hex.
  customColors = [
    { name: "Up", value: "#12a77a" },
    { name: "Down", value: "#e5604f" },
  ];

  // ViewChild setter handles the ResizeObserver setup.
  @ViewChild("containerRef")
  set containerRef(element: ElementRef<HTMLDivElement> | undefined) {
    if (element) {
      this._containerRef = element;
      this.initializeResizeObserver();
    } else if (this._containerRef) {
      this.resizeObserver?.disconnect();
      this._containerRef = undefined;
    }
  }

  initializeResizeObserver(): void {
    this.resizeObserver?.disconnect();

    this.resizeObserver = new ResizeObserver((entries) => {
      const { width } = entries[0].contentRect;

      this.view.set([width, 250]);
    });

    if (this._containerRef) {
      this.resizeObserver.observe(this._containerRef.nativeElement);
    }
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
  }
}
