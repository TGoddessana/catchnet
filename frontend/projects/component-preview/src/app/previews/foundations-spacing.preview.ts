import {
  Component,
  ChangeDetectionStrategy,
  ElementRef,
  effect,
  inject,
  signal,
} from "@angular/core";
import {
  ELEVATION_TOKENS,
  HEIGHT_TOKENS,
  MATERIAL_SAMPLES,
  RADIUS_TOKENS,
  resolveCssVar,
  SPACE_TOKENS,
} from "../foundations/tokens";
import { ThemeStore } from "../theme-store";

interface ResolvedSpace {
  name: string;
  value: string;
}

interface ResolvedToken {
  name: string;
  label?: string;
  value: string;
}

interface ResolvedElevation {
  name: string;
  label?: string;
  value: string;
}

/**
 * Spacing, radius, control height, material and elevation reference. The
 * spacing scale is the `--gt-space-*` token set (multiples of 4). Elevation tokens are probed and
 * any that resolve empty are hidden, so the page stays honest about what the
 * theme actually defines.
 */
@Component({
  selector: "preview-foundations-spacing",
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [
    `
      .fs-space-row {
        display: flex;
        align-items: center;
        gap: 16px;
        margin-bottom: 10px;
      }
      .fs-space-bar {
        height: 16px;
        background-color: var(--mat-sys-primary);
        border-radius: 2px;
      }
      .fs-space-name {
        font-family: var(--gt-font-mono, monospace);
        font-size: 0.78rem;
        min-width: 120px;
      }
      .fs-space-value {
        font-size: 0.75rem;
        color: var(--mat-sys-on-surface-variant);
      }
      .fs-radius {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 96px;
        height: 64px;
        background-color: var(--mat-sys-surface-container-high);
        border: 1px solid var(--mat-sys-outline-variant);
        font-family: var(--gt-font-mono, monospace);
        font-size: 0.78rem;
      }
      .fs-radii,
      .fs-materials {
        display: flex;
        flex-wrap: wrap;
        gap: var(--gt-space-4);
      }
      .fs-radius-item,
      .fs-material-item {
        display: flex;
        flex-direction: column;
        gap: var(--gt-space-2);
        max-width: 180px;
      }
      .fs-token-label {
        font: var(--mat-sys-body-small);
        color: var(--mat-sys-on-surface-variant);
      }
      .fs-height {
        display: inline-flex;
        align-items: center;
        padding: 0 var(--gt-space-4);
        border-radius: var(--gt-radius-control);
        background: var(--gt-raised-surface);
        box-shadow: var(--gt-raised-shadow);
        font: var(--mat-sys-label-large);
      }
      .fs-material {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 160px;
        height: var(--gt-control-height);
        border-radius: var(--gt-radius-control);
        color: var(--gt-color-text-1);
        font: var(--mat-sys-label-large);
      }
      .fs-materials {
        padding: var(--gt-space-5);
        border-radius: var(--gt-radius-card);
        background-color: var(--gt-color-background);
      }
      .fs-bp-table {
        border-collapse: collapse;
        font: var(--mat-sys-body-small);
        min-width: 480px;
      }
      .fs-bp-table th,
      .fs-bp-table td {
        text-align: left;
        padding: var(--gt-space-2) var(--gt-space-3);
        border-bottom: 1px solid var(--mat-sys-outline-variant);
      }
      .fs-bp-table th {
        font: var(--mat-sys-label-medium);
        color: var(--mat-sys-on-surface-variant);
      }
      .fs-bp-table code {
        font-family: var(--gt-font-mono, monospace);
        font-size: 0.85em;
      }
      .fs-elevations {
        display: flex;
        flex-wrap: wrap;
        gap: 24px;
        // A stage below surface level so the boxes have something to sit on
        // and cast onto in both schemes.
        padding: var(--gt-space-4);
        border-radius: 8px;
        background-color: var(--mat-sys-surface-container-lowest, var(--mat-sys-background));
      }
      .fs-elevation {
        width: 120px;
        height: 72px;
        border-radius: 8px;
        background-color: var(--mat-sys-surface);
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: var(--gt-font-mono, monospace);
        font-size: 0.72rem;
      }
      .fs-surfaces {
        display: flex;
        flex-wrap: wrap;
        gap: var(--gt-space-4);
      }
      .fs-surface {
        width: 150px;
        height: 72px;
        border-radius: 8px;
        border: 1px solid var(--mat-sys-outline-variant);
        display: flex;
        align-items: center;
        justify-content: center;
        text-align: center;
        padding: var(--gt-space-2);
        font-family: var(--gt-font-mono, monospace);
        font-size: 0.68rem;
      }
    `,
  ],
  template: `
    <header class="preview-page-header">
      <h1 class="preview-page-title">Layout</h1>
      <p class="preview-lead">
        The spacing scale, breakpoints, corner radius, and elevation levels
        the system is built on.
      </p>
    </header>

    <div class="preview-section">
      <div class="preview-section__title">Spacing scale</div>
      <p class="preview-section__note">
        Multiples of 4, exposed as <code>--gt-space-*</code> tokens. Prefer
        these over ad-hoc pixel values in new code.
      </p>
      @for (s of spaces(); track s.name) {
        <div class="fs-space-row">
          <span class="fs-space-name">{{ s.name }}</span>
          <span class="fs-space-bar" [style.width]="s.value || '0px'"></span>
          <span class="fs-space-value">{{ s.value || "0" }}</span>
        </div>
      }
    </div>

    <div class="preview-section">
      <div class="preview-section__title">Density</div>
      <p class="preview-section__note">
        Control density with the same scale. Use the smaller steps
        (<code>--gt-space-1</code> to <code>--gt-space-3</code>) for dense,
        data-heavy views like tables and lists, and the larger steps
        (<code>--gt-space-5</code> to <code>--gt-space-7</code>) to separate
        sections and give a page room. Keep one view consistent; do not mix a
        tight row gap with a roomy one. When a whole view needs to be more
        compact, tune Material's component density in the theme rather than
        shrinking values by hand.
      </p>
    </div>

    <div class="preview-section">
      <div class="preview-section__title">Breakpoints</div>
      <p class="preview-section__note">
        Min-width breakpoints aligned with the Angular CDK (defined in
        <code>_variables.scss</code>). These are window media queries:
        components adapt to the browser width, mostly by pages swapping content
        via a <code>BreakpointObserver</code> signal like
        <code>isMobile()</code>. To see it, resize the browser (this guide is
        itself responsive). The per-example width toggle, where shown, is a
        narrower thing: how a component reflows inside a smaller container.
      </p>
      <table class="fs-bp-table">
        <thead>
          <tr>
            <th>Variable</th>
            <th>Min width</th>
            <th>Typical use</th>
          </tr>
        </thead>
        <tbody>
          @for (bp of breakpoints; track bp.name) {
            <tr>
              <td><code>{{ bp.name }}</code></td>
              <td><code>{{ bp.value }}</code></td>
              <td>{{ bp.usage }}</td>
            </tr>
          }
        </tbody>
      </table>
    </div>

    <div class="preview-section">
      <div class="preview-section__title">Radius</div>
      <p class="preview-section__note">
        Four radii only, picked by what the thing is. Material's corner scale
        is mapped onto these, so Material components follow the same rule.
      </p>
      <div class="fs-radii">
        @for (r of radii(); track r.name) {
          <div class="fs-radius-item">
            <div class="fs-radius" [style.border-radius]="'var(' + r.name + ')'">
              {{ r.value }}
            </div>
            <code>{{ r.name }}</code>
            <span class="fs-token-label">{{ r.label }}</span>
          </div>
        }
      </div>
    </div>

    <div class="preview-section">
      <div class="preview-section__title">Control height</div>
      <p class="preview-section__note">
        Two heights only. Buttons, inputs and toggles are the default height;
        buttons inside lists and tables, and filter chips, are the small one.
      </p>
      <div class="fs-radii">
        @for (h of heights(); track h.name) {
          <div class="fs-radius-item">
            <div class="fs-height" [style.height]="'var(' + h.name + ')'">
              {{ h.value }}
            </div>
            <code>{{ h.name }}</code>
            <span class="fs-token-label">{{ h.label }}</span>
          </div>
        }
      </div>
    </div>

    <div class="preview-section">
      <div class="preview-section__title">Material</div>
      <p class="preview-section__note">
        Only things shaped like a button are raised. Everything else is flat
        like paper. A disabled button drops the raised look so it reads as
        "not now".
      </p>
      <div class="fs-materials">
        @for (m of materials; track m.label) {
          <div class="fs-material-item">
            <div
              class="fs-material"
              [style.background]="m.background"
              [style.box-shadow]="m.shadow"
              [style.color]="m.color ?? null"
            >
              {{ m.label }}
            </div>
            <span class="fs-token-label">{{ m.use }}</span>
          </div>
        }
      </div>
    </div>

    @if (elevations().length) {
      <div class="preview-section">
        <div class="preview-section__title">Elevation</div>
        <p class="preview-section__note">
          Material 3 elevation levels defined by the theme. These tokens are
          shadows and nothing else; every box below is the same surface color.
          Toggle to dark and they nearly disappear: that is real, dark themes
          keep shadows subtle on purpose. Dark mode layers UI with the surface
          ladder below instead.
        </p>
        <div class="fs-elevations">
          @for (e of elevations(); track e.name) {
            <div class="fs-elevation" [style.box-shadow]="'var(' + e.name + ')'">
              {{ e.label }}
            </div>
          }
        </div>
      </div>

      <div class="preview-section">
        <div class="preview-section__title">Surface layering</div>
        <p class="preview-section__note">
          The surface-container ladder Material components read. catchnet maps
          it onto three surfaces: low is the page background, container is the
          card surface, and high and highest are the subtle fill.
        </p>
        <div class="fs-surfaces">
          @for (s of surfaceLadder; track s) {
            <div class="fs-surface" [style.background-color]="'var(' + s + ')'">
              {{ s }}
            </div>
          }
        </div>
      </div>
    }
  `,
})
export class FoundationsSpacingPreview {
  private readonly host = inject(ElementRef);
  private readonly themeStore = inject(ThemeStore);

  readonly spaces = signal<ResolvedSpace[]>([]);
  readonly radii = signal<ResolvedToken[]>([]);
  readonly heights = signal<ResolvedToken[]>([]);
  readonly materials = MATERIAL_SAMPLES;
  readonly elevations = signal<ResolvedElevation[]>([]);

  /**
   * The surface-container roles, lowest to highest. Shown as their own
   * ladder, deliberately not mapped to elevation levels: the theme defines
   * no level-to-container relationship, components pick a container by role.
   */
  readonly surfaceLadder = [
    "--mat-sys-surface",
    "--mat-sys-surface-container-low",
    "--mat-sys-surface-container",
    "--mat-sys-surface-container-high",
    "--mat-sys-surface-container-highest",
  ];

  // SCSS variables cannot be read live; keep in sync with
  // src/assets/styles/_variables.scss.
  readonly breakpoints = [
    { name: "$Xsmall", value: "0px", usage: "Phones" },
    { name: "$small", value: "600px", usage: "Mobile nav collapses above this" },
    { name: "$tablet", value: "768px", usage: "Detail headers stack below this" },
    { name: "$medium", value: "960px", usage: "Side-by-side layouts" },
    { name: "$large", value: "1280px", usage: "Wide desktop layouts" },
    { name: "$Xlarge", value: "1920px", usage: "Very wide screens" },
  ];

  constructor() {
    effect(() => {
      this.themeStore.theme();
      const el = this.host.nativeElement as Element;

      this.spaces.set(
        SPACE_TOKENS.map((t) => ({
          name: t.name,
          value: resolveCssVar(t.name, el),
        })),
      );

      const resolve = (list: typeof RADIUS_TOKENS) =>
        list.map((t) => ({
          name: t.name,
          label: t.label,
          value: resolveCssVar(t.name, el),
        }));
      this.radii.set(resolve(RADIUS_TOKENS));
      this.heights.set(resolve(HEIGHT_TOKENS));

      this.elevations.set(
        ELEVATION_TOKENS.map((t) => ({
          name: t.name,
          label: t.label,
          value: resolveCssVar(t.name, el),
        })).filter((e) => e.value.length > 0),
      );
    });
  }
}
