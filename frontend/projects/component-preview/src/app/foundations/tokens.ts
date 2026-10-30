/**
 * Curated lists of the design tokens surfaced on the Foundations pages.
 *
 * `getComputedStyle` can read a custom property's value but cannot *enumerate*
 * which custom properties exist, so the token *names* are authored here (the
 * single source of truth for "what's in the system") while their *values* are
 * read live from the DOM via `resolveCssVar`. That keeps the reference honest:
 * if a token's value changes in the app theme, this page reflects it with no
 * edit here; only adding/removing a token needs a change to these lists.
 */

/** A single design token to display: its CSS custom-property name and a label. */
export interface TokenDef {
  /** CSS custom property, including the leading `--`. */
  readonly name: string;
  /** Short human label shown alongside the token. */
  readonly label?: string;
}

/** A named group of tokens, rendered as one section on a Foundations page. */
export interface TokenGroup {
  readonly group: string;
  readonly note?: string;
  readonly tokens: TokenDef[];
}

/** A background/foreground pairing, used to preview text contrast on a color. */
export interface ColorPair {
  readonly label: string;
  readonly bg: string;
  readonly on: string;
}

/**
 * catchnet color tokens (defined in `src/assets/styles/_tokens.scss`), then
 * the Material 3 system roles mapped onto them. Grouped by role.
 */
export const COLOR_TOKENS: TokenGroup[] = [
  {
    group: "Surfaces",
    note: "The page is background. Cards, tables and panels are surface with a border. Subtle fills tracks, hovers and quiet areas.",
    tokens: [
      { name: "--gt-color-background" },
      { name: "--gt-color-surface" },
      { name: "--gt-color-subtle" },
      { name: "--gt-color-border" },
    ],
  },
  {
    group: "Text",
    note: "Three text levels, each at least 4.5:1 on every surface. Disabled text is only for controls that cannot be pressed.",
    tokens: [
      { name: "--gt-color-text-1" },
      { name: "--gt-color-text-2" },
      { name: "--gt-color-text-3" },
      { name: "--gt-color-text-disabled" },
    ],
  },
  {
    group: "Accent",
    note: "Accent fills primary buttons and selection. Text in the accent color always uses accent-text.",
    tokens: [
      { name: "--gt-color-accent" },
      { name: "--gt-color-on-accent" },
      { name: "--gt-color-accent-text" },
      { name: "--gt-color-accent-soft" },
    ],
  },
  {
    group: "Status",
    note: "Each status has a dot, a text color and a soft background. Dots share one lightness and chroma so none shouts. Red is for errors only, and a status always comes with a word or an icon.",
    tokens: [
      { name: "--gt-color-error-dot" },
      { name: "--gt-color-error-text" },
      { name: "--gt-color-error-soft" },
      { name: "--gt-color-warning-dot" },
      { name: "--gt-color-warning-text" },
      { name: "--gt-color-warning-soft" },
      { name: "--gt-color-success-dot" },
      { name: "--gt-color-success-text" },
      { name: "--gt-color-success-soft" },
    ],
  },
  {
    group: "Material system roles",
    note: "Material components read these. Each one is mapped onto a catchnet token above, so prefer the catchnet token in new code.",
    tokens: [
      { name: "--mat-sys-primary" },
      { name: "--mat-sys-on-primary" },
      { name: "--mat-sys-primary-container" },
      { name: "--mat-sys-on-primary-container" },
      { name: "--mat-sys-secondary-container" },
      { name: "--mat-sys-on-secondary-container" },
      { name: "--mat-sys-background" },
      { name: "--mat-sys-surface" },
      { name: "--mat-sys-on-surface" },
      { name: "--mat-sys-on-surface-variant" },
      { name: "--mat-sys-surface-container-low" },
      { name: "--mat-sys-surface-container" },
      { name: "--mat-sys-surface-container-high" },
      { name: "--mat-sys-error" },
      { name: "--mat-sys-error-container" },
      { name: "--mat-sys-outline" },
      { name: "--mat-sys-outline-variant" },
    ],
  },
  {
    group: "Legacy extended roles",
    note: "Older app-specific roles, now pointed at the catchnet status colors. Use the --gt-color-* tokens in new code.",
    tokens: [
      { name: "--warning-color" },
      { name: "--warning-container" },
      { name: "--on-warning" },
      { name: "--info-color" },
      { name: "--info-container" },
      { name: "--on-info" },
      { name: "--success-color" },
      { name: "--success-container" },
      { name: "--on-success" },
      { name: "--issues-color", label: "Issues" },
      { name: "--uptime-color", label: "Uptime" },
      { name: "--logs-color", label: "Logs" },
    ],
  },
];

/**
 * Background/on-color pairings for the contrast strip. Each renders the `on`
 * token as text on the `bg` token so mismatches are obvious at a glance.
 */
export const ON_COLOR_PAIRS: ColorPair[] = [
  { label: "Accent", bg: "--gt-color-accent", on: "--gt-color-on-accent" },
  {
    label: "Accent soft",
    bg: "--gt-color-accent-soft",
    on: "--gt-color-accent-text",
  },
  { label: "Surface", bg: "--gt-color-surface", on: "--gt-color-text-1" },
  { label: "Background, faintest text", bg: "--gt-color-background", on: "--gt-color-text-3" },
  { label: "Subtle, faintest text", bg: "--gt-color-subtle", on: "--gt-color-text-3" },
  { label: "Error", bg: "--gt-color-error-soft", on: "--gt-color-error-text" },
  { label: "Warning", bg: "--gt-color-warning-soft", on: "--gt-color-warning-text" },
  { label: "Success", bg: "--gt-color-success-soft", on: "--gt-color-success-text" },
];

/**
 * Material 3 typography tokens. Each resolves to a full `font` shorthand, so
 * applying it as `font: var(--name)` reproduces the exact type style.
 */
export const TYPE_TOKENS: TokenDef[] = [
  { name: "--mat-sys-headline-small", label: "Headline small" },
  { name: "--mat-sys-title-large", label: "Title large" },
  { name: "--mat-sys-title-medium", label: "Title medium" },
  { name: "--mat-sys-title-small", label: "Title small" },
  { name: "--mat-sys-body-large", label: "Body large" },
  { name: "--mat-sys-body-medium", label: "Body medium" },
  { name: "--mat-sys-body-small", label: "Body small" },
  { name: "--mat-sys-label-large", label: "Label large" },
  { name: "--mat-sys-label-medium", label: "Label medium" },
];

/**
 * The app's custom text classes (defined in `_font-files.scss`), which layer
 * semantic intent on top of the raw Material type tokens.
 */
export const CUSTOM_TYPE_CLASSES: { className: string; usage: string }[] = [
  { className: "section-header-text", usage: "Page titles" },
  { className: "section-header-text-light", usage: "Issue titles (lighter weight)" },
  { className: "body-text", usage: "Longer text blocks" },
  { className: "body-text-strong", usage: "Emphasized body text" },
  { className: "caption-text", usage: "Small / secondary text" },
];

/**
 * The spacing scale (multiples of 4) defined in
 * `src/assets/styles/_tokens.scss`. Migrating existing ad-hoc px usage onto
 * these is roadmap.
 */
export const SPACE_TOKENS: TokenDef[] = [
  { name: "--gt-space-0" },
  { name: "--gt-space-1" },
  { name: "--gt-space-2" },
  { name: "--gt-space-3" },
  { name: "--gt-space-4" },
  { name: "--gt-space-5" },
  { name: "--gt-space-6" },
  { name: "--gt-space-7" },
];

/** The four corner radii. Nothing else is rounded. */
export const RADIUS_TOKENS: TokenDef[] = [
  { name: "--gt-radius-badge", label: "Badges" },
  { name: "--gt-radius-control", label: "Buttons, inputs, menu items" },
  { name: "--gt-radius-card", label: "Cards, panels, tables, menus" },
  { name: "--gt-radius-pill", label: "Filter chips, tabs, avatars, counts" },
];

/** The two control heights. */
export const HEIGHT_TOKENS: TokenDef[] = [
  { name: "--gt-control-height", label: "Default" },
  { name: "--gt-control-height-sm", label: "Inside lists and tables, filter chips" },
];

/** The three font weights. 700 is never used. */
export const WEIGHT_TOKENS: TokenDef[] = [
  { name: "--gt-weight-regular", label: "Body text" },
  { name: "--gt-weight-medium", label: "Labels, buttons, nav" },
  { name: "--gt-weight-strong", label: "Titles, emphasis" },
];

/** Font stacks. */
export const FONT_TOKENS: TokenDef[] = [
  { name: "--gt-font-ui", label: "UI (Inter, Pretendard for Hangul)" },
  { name: "--gt-font-code", label: "Code (JetBrains Mono)" },
];

/**
 * Material rule: only things shaped like a button are raised; everything else
 * is flat like paper. Each entry is a background and shadow pair.
 */
export const MATERIAL_SAMPLES: {
  label: string;
  use: string;
  background: string;
  shadow: string;
  color?: string;
}[] = [
  {
    label: "Primary",
    use: "Primary button",
    background: "var(--gt-primary-highlight), var(--gt-color-accent)",
    shadow: "var(--gt-primary-shadow)",
    color: "var(--gt-color-on-accent)",
  },
  {
    label: "Raised",
    use: "Secondary button, filter chip, selected tab",
    background: "var(--gt-raised-surface)",
    shadow: "var(--gt-raised-shadow)",
  },
  {
    label: "Flat",
    use: "Card, table, panel",
    background: "var(--gt-color-surface)",
    shadow: "0 0 0 1px var(--gt-color-border), var(--gt-card-shadow)",
  },
  {
    label: "Sunken",
    use: "Input",
    background: "var(--gt-color-surface)",
    shadow: "inset 0 0 0 1px var(--gt-color-border), var(--gt-input-shadow)",
  },
  {
    label: "Disabled",
    use: "Any button that cannot be pressed",
    background: "var(--gt-color-subtle)",
    shadow: "none",
    color: "var(--gt-color-text-disabled)",
  },
];

/** Material 3 elevation level tokens, probed (empties are hidden by the page). */
export const ELEVATION_TOKENS: TokenDef[] = [
  { name: "--mat-sys-level0", label: "Level 0" },
  { name: "--mat-sys-level1", label: "Level 1" },
  { name: "--mat-sys-level2", label: "Level 2" },
  { name: "--mat-sys-level3", label: "Level 3" },
  { name: "--mat-sys-level4", label: "Level 4" },
  { name: "--mat-sys-level5", label: "Level 5" },
];

/**
 * Reads a CSS custom property's *declared* value from the given element's
 * computed style. Good for non-color tokens (type shorthands, spacing) whose
 * declaration is already the final value. Resolving against an element inside
 * the preview canvas matters: the canvas sets `color-scheme`.
 *
 * Note: for color tokens declared with `light-dark(...)`, this returns the raw
 * expression, not the scheme-resolved color — use `resolveComputedColor` for
 * those.
 */
export function resolveCssVar(name: string, el: Element): string {
  return getComputedStyle(el).getPropertyValue(name).trim();
}

/**
 * Resolves a color token to the actual color painted in the current scheme.
 * `getComputedStyle` on a custom property returns its declaration (e.g. the
 * `light-dark(...)` expression), so instead we paint the token onto a throwaway
 * probe element inside the canvas subtree and read back the computed `color`,
 * which the browser resolves for the canvas' `color-scheme`. Returned as a hex
 * string for a compact, familiar display.
 */
export function resolveComputedColor(name: string, hostEl: Element): string {
  const doc = hostEl.ownerDocument;
  const probe = doc.createElement("span");
  probe.style.cssText = "position:absolute;left:-9999px;width:0;height:0;";
  probe.style.color = `var(${name})`;
  hostEl.appendChild(probe);
  const computed = getComputedStyle(probe).color;
  hostEl.removeChild(probe);
  return rgbToHex(computed);
}

/** Converts an `rgb()`/`rgba()` string to `#rrggbb` (keeping alpha if < 1). */
function rgbToHex(color: string): string {
  const match = color.match(/rgba?\(([^)]+)\)/);
  if (!match) return color;
  const parts = match[1].split(",").map((p) => p.trim());
  const toHex = (v: string) =>
    Math.round(parseFloat(v)).toString(16).padStart(2, "0");
  const hex = `#${toHex(parts[0])}${toHex(parts[1])}${toHex(parts[2])}`;
  if (parts.length === 4 && parseFloat(parts[3]) < 1) {
    return `${hex} / ${parts[3]}`;
  }
  return hex;
}
