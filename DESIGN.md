# catchnet Design Language

This is the source of truth for catchnet's visual language: the tokens, the rules for using them, and the reasoning behind them. It is written for humans first, and its structure also makes it legible to AI coding assistants so generated UI stays on system.

catchnet is a fork of GlitchTip. The token and theme layer described here (`src/styles.scss`, `src/assets/styles/`) is where catchnet differs from upstream; component templates stay as close to upstream as possible so upstream changes keep merging cleanly.

The living, interactive version of this document is the **Component Preview** app (`projects/component-preview/`, run with `npm run preview`). It renders real components and reads token values live from the running theme.

The preview is the **north star**: it defines how each pattern should look and behave. Where the shipped product does not yet match a rule, that is tracked as a ticket, not a reason to water down the rule. Foundations (tokens, type, spacing) still read live from the theme so they cannot drift; component and pattern pages show the intended rule, and a `designNotes` chip flags any page whose ideal the product has not adopted yet.

## Principles

1. **Usable without training.** Plain words and familiar patterns. Nobody should need a manual to triage an error.
2. **Calm, never alarming.** Quiet colors. Red means an error and nothing else.
3. **One rule everywhere.** Four radii, two control heights, three weights. The same thing looks the same on every screen.

## Direction

We have been moving toward a **rapid-prototype, code-first, AI-readable design system**:

- **Code-first.** The reference renders real components and resolves tokens live from the DOM, not a static mock or a Figma file that goes stale the moment code changes.
- **Rapid-prototype.** A registry drives the preview: surfacing a new component or foundation is one entry in `registry.ts`, so the system grows in minutes.
- **AI-readable.** Explicit tokens plus this written spec let an assistant generate and review UI against a single source of truth instead of inventing generic defaults.

## Tokens

All tokens are CSS custom properties defined in `src/assets/styles/_tokens.scss`. Read them live; never hardcode a raw value that a token already expresses.

### Color

Light is the default. Dark follows `color-scheme` on `<html>`: the operating system setting, or the theme preference a user picks in their profile. Every color is written with `light-dark()`, so both schemes come from one declaration and nothing depends on a media query.

| Token | Light | Dark | Use |
| --- | --- | --- | --- |
| `--gt-color-background` | #F7F6F3 | #141412 | The page |
| `--gt-color-surface` | #FFFFFF | #1A1917 | Cards, tables, panels, inputs |
| `--gt-color-subtle` | #F0EFEB | #22211F | Tracks, hovers, quiet fills, table row dividers |
| `--gt-color-border` | #E6E5E0 | #2C2B28 | 1px borders |
| `--gt-color-text-1` | #1C1B18 | #E8E7E3 | Primary text |
| `--gt-color-text-2` | #53524D | #B1B0AB | Secondary text |
| `--gt-color-text-3` | #6A6964 | #8D8C87 | Faintest text, labels, meta |
| `--gt-color-text-disabled` | #9F9E98 | #5F5E59 | Controls that cannot be pressed |
| `--gt-color-accent` | #5E6AD2 | #8B95E8 | Primary button fill, selection |
| `--gt-color-on-accent` | #FFFFFF | #141412 | Text on an accent fill |
| `--gt-color-accent-text` | #4652B8 | #AEB5EE | Text in the accent color (links, text buttons) |
| `--gt-color-accent-soft` | #EEF0FB | #262A45 | Selected nav item, highlighted chip |
| `--gt-color-error-dot / -text / -soft` | #DF8074 / #873F38 / #FDEFEC | #E48A7E / #E48A7E / #3A2522 | Errors only |
| `--gt-color-warning-dot / -text / -soft` | #CA933E / #784E10 / #FBF2E6 | #D6A458 / #D6A458 / #362C1C | Warnings |
| `--gt-color-success-dot / -text / -soft` | #30B69A / #006955 / #E8F8F3 | #4DBFA2 / #4DBFA2 / #1B322B | Healthy, fixed |

Rules:

- Use a token, not a raw hex. Text on a colored fill uses the matching text token so contrast holds in both schemes.
- Light `accent` reaches only 4.35:1 on the page background, so text in the accent color always uses `accent-text`.
- Status dots share one OKLCH lightness and chroma (L 0.70, C 0.12) so no status shouts louder than another.
- Red is for errors only. There is no brand red.
- Never show a status by color alone. Pair the dot with a word or an icon.

**Material system roles.** Material components read `--mat-sys-*`. Every role in use is mapped onto a catchnet token in `material-system-overrides` in `_tokens.scss` (for example `primary` is `accent`, `secondary-container` is `accent-soft`, `surface-container-high` is `subtle`, `outline` is `text-3`, `outline-variant` is `border`). Prefer the `--gt-color-*` token in new code.

**Legacy extended roles.** `--warning-color`, `--info-color`, `--success-color` (each with `-container` and `on-`), and the chart series `--issues-color`, `--uptime-color`, `--logs-color` still exist and now point at the catchnet palette. Use the `--gt-color-*` tokens in new code.

### Typography

- **Fonts:** Inter for the interface, Pretendard for Hangul, JetBrains Mono for code. All self-hosted as variable woff2 under the SIL OFL 1.1 (`src/assets/fonts/`, declared in `_catchnet-fonts.scss`). Pretendard is limited to Hangul ranges, so it downloads only when Korean text is on the page. Tokens: `--gt-font-ui`, `--gt-font-code`.
- **Weights:** `--gt-weight-regular` (400) for body text, `--gt-weight-medium` (500) for labels, buttons and nav, `--gt-weight-strong` (600) for titles and emphasis. 700 is never used; the font faces declare a 400 to 600 range, so a stray `bold` renders at 600.
- **Material type tokens:** `--mat-sys-headline-small`, `-title-large/medium/small`, `-body-large/medium/small`, `-label-large/medium`. Apply as `font: var(--token)`. They use the catchnet fonts and weights.
- **Semantic classes** (in `src/assets/styles/_font-files.scss`): `.section-header-text` (page titles), `.section-header-text-light` (issue titles), `.body-text`, `.body-text-strong`, `.caption-text`. These are responsive.
- **Wordmark:** `catchnet`, lowercase, Inter 600, tracking -0.03em (`--gt-wordmark-tracking`).

Rule: prefer a semantic class where one exists; otherwise apply the matching type token.

The marketing site still uses IBM Plex. The shared Sass font variables (`$font-sans-serif`, `$font-mono`) resolve through the app's custom properties and fall back to Plex where those are not defined.

### Spacing

Multiples of 4, exposed as `--gt-space-*`:

| Token | Value |
| --- | --- |
| `--gt-space-0` | 0 |
| `--gt-space-1` | 4px |
| `--gt-space-2` | 8px |
| `--gt-space-3` | 12px |
| `--gt-space-4` | 16px |
| `--gt-space-5` | 24px |
| `--gt-space-6` | 32px |
| `--gt-space-7` | 48px |

Rule: use these in new code instead of ad-hoc pixel values. Migrating existing usage onto the scale is planned follow-up work.

### Radius and control height

Four radii, picked by what the thing is:

| Token | Value | Use |
| --- | --- | --- |
| `--gt-radius-badge` | 6px | Badges |
| `--gt-radius-control` | 10px | Buttons, inputs, menu items |
| `--gt-radius-card` | 16px | Cards, panels, tables, menus, dialogs |
| `--gt-radius-pill` | 999px | Filter chips, tabs, avatars, counts |

Material's corner scale (`--mat-sys-corner-*`) is collapsed onto these four, so Material components follow the same rule. Sass mirrors them as `$radius-*`; `$shape-radius` is the control radius.

Two control heights: `--gt-control-height` (40px) by default, `--gt-control-height-sm` (32px) for buttons inside lists and tables, filter chips, and the segments of tabs and toggles.

### Material

**Only things shaped like a button are raised. Everything else is flat like paper.**

| Surface | Look | Tokens |
| --- | --- | --- |
| Primary button | Accent fill, soft top highlight, drop shadow tinted with the accent | `--gt-primary-highlight`, `--gt-primary-shadow` |
| Secondary button, filter chip, selected tab or toggle | Light gradient paper, no border: a 1px shadow ring draws the edge | `--gt-raised-surface`, `--gt-raised-shadow` |
| Card, table, panel | Flat surface, 1px border, at most a whisper of shadow | `--gt-card-shadow` |
| Menu, select, autocomplete panel | Surface, border ring, soft float shadow | `--gt-overlay-shadow` |
| Input | Flat surface, 1px border, slight inset shadow | `--gt-input-shadow` |
| Disabled button | Flat, subtle fill, disabled text: the raised look is gone, so it reads as "not now" | |

These are applied to Material components in `src/assets/styles/material-overrides/`. Tabs and button toggles render as segmented controls: a flat subtle pill track with the selected segment raised.

Each override partial wraps its tokens in `:root`, because `mat.theme` emits density tokens on `html` later in the cascade and `:root` is more specific.

### Brand

- Name: **catchnet**, always lowercase.
- Logo: a 28px rounded square (rx 9) in the accent color holding a white C-shaped arc and a dot. Files: `src/assets/images/catchnet-logo.svg` (mark and wordmark, wordmark outlined from Inter 600 so it needs no font, light and dark aware) and `catchnet-mark.svg` (mark only). Favicons: `src/favicon.svg`, `src/favicon.ico`.

## Writing

Plain words over jargon. These replacements are agreed and will land with the screen redesigns (the current UI still uses the left column):

| Today | catchnet |
| --- | --- |
| Unresolved | Open |
| Resolved | Fixed |
| Ignored | Muted |
| Resolve | Mark as fixed |
| Events | Times |
| Users | People affected |
| Breadcrumbs | Steps before it |
| Stack trace | Where in the code |

## Components

Reusable components live in `src/app/shared/`. Each documented component in the preview app carries: a description, when-to-use guidance, do and don't lists, an accessibility note, and a copyable usage snippet (via the shared `preview-doc` wrapper).

Conventions for every component:

- Standalone, `ChangeDetectionStrategy.OnPush`, signal inputs and outputs.
- Selector prefix `gt-`.
- Build write and delete controls behind the relevant permission signal (see the permission-gating convention in `CLAUDE.md`).

## Accessibility

- Text meets 4.5:1 (3:1 at 24px, or 18.66px and 600). Every text token passes on every surface in both schemes; the preview app shows the pairings for a quick check.
- Meaningful icons and control edges meet 3:1. That is why Material's `outline` maps to `text-3`, not the disabled color.
- Do not dim text with `opacity`. Use `text-2` or `text-3`, which are tuned to pass.
- Interactive controls are keyboard reachable and have an accessible name.
- State (loading, disabled, selected) is conveyed by more than color alone.

## Governance

- The preview app is the **north-star rulebook**; the product aligns to it via audit tickets, not the reverse. Deliberate divergence (rule set here, product migrated via tickets) is the model; ad-hoc divergence is not.
- Run a **style audit** per pattern to measure product drift and turn the gaps into tracked tickets.
- Document what the product ships, not what mature systems have. A page earns its place by answering questions developers actually hit; benchmark gaps are candidates, not requirements.
- Add a component or foundation by adding a `registry.ts` entry and, where useful, wrapping it in `preview-doc`.

### Page recipe

Every page follows one of two templates so pages read the same way.

**Component and pattern pages** wrap the example in `preview-doc`, which fixes the section order. Fill, top to bottom:

- **description**: one or two plain sentences. What it is and where it is used.
- the live example (projected content).
- **When to use / Do / Don't**: short imperative lines.
- **Writing**: how to word the component's labels and copy. Include it when the component has user-facing text (button labels, dialog copy, banner headlines, field labels); omit it otherwise.
- **Accessibility**: the one thing an implementer must get right.
- **Keyboard**: only when the component has behavior beyond default tab-and-activate.
- **Anatomy**: the named parts, when the component has parts worth naming.
- **Relationships**: which components this one is meant to sit inside (`within`) and which it is meant to hold (`contains`). Include it wherever composition is not obvious. Every claim must be verifiable in product code (grep the usage before writing it); omit `within` when a component is used everywhere, and qualify a `contains` that only holds for one variant.
- **Properties**: the input/output table.
- **Usage**: a copyable snippet of the real component.

Required on every component page: description, example, When to use, Do, Don't, Accessibility, Properties, Usage. Writing, Keyboard, and Anatomy are added only when they carry real information, never as filler.

**Foundation and reference pages** (colors, spacing, typography, icons, symbols) do not use `preview-doc`. They document tokens or assets, not usage, so they use a page header, a one-line lead, and the reference content, and they read values live from the theme wherever possible so they cannot drift. They carry no When to use or Do/Don't.

Voice: plain and human. A verb-first instruction beats a description of one. No em or en dashes. Only essential, helpful information.

Icons: a preview example may only use a Material Symbol that is in the app's self-hosted subset (the list on the Material symbols page); any other name renders as broken ligature text, not a glyph.

### Component lifecycle

Every documented component carries a status, following the practice of published design systems (Polaris, USWDS, Carbon):

- **stable**: current conventions (signal inputs/outputs, OnPush), reviewed, safe to use.
- **legacy**: works and is supported, but predates current conventions and is slated for an update. Fine to use; expect changes.
- **deprecated**: do not use in new code; the component's page names the replacement.

Statuses live on the `registry.ts` entry and render as each page's `preview-doc` chip (the nav stays label-only so it cannot overflow). Updating a legacy component to current conventions flips its badge to stable, which makes modernization progress visible.

### Visual audit notes

Orthogonal to the lifecycle status (which tracks code conventions), a page can carry `designNotes`: neutral chips flagging design polish, e.g. "visual refresh planned" or "off-system by design". These come out of the visual audit done while isolating components into this guide, and each note is expected to become a ticket. This keeps two honest, separate answers on every component: is the code current, and does it look on-system.

## Hosting

The style guide is published with GitLab Pages, sharing the one Pages site this project gets with the marketing website: marketing at the root domain, the style guide at `/style-guide/`. Both are built by the single `pages` job in `.gitlab-ci.yml`.

Why this shape:

- A GitLab project has exactly one Pages site. A second `pages` job on another branch would replace the marketing site, so the style guide must build inside the same job.
- The job runs on the `marketing` branch. To refresh the published style guide, merge `master` into `marketing` (the same flow as a website update). Publication is therefore a deliberate release, not automatic on every master commit.
- The style guide build passes `--base-href /style-guide/`; that value must match the subpath or its assets 404.
- The page is world-readable on the marketing domain. Treat it as public: it is a component library and a credibility asset, and nothing confidential belongs in it.
- If we later want the style guide tracking `master` independently of marketing releases, the upgrade paths are GitLab parallel Pages deployments (`pages.path_prefix`, paid tier; GlitchTip may qualify through the GitLab Open Source Program) or a dedicated project.

Until it is published, run it locally with `npm run preview` (port 4300, requires node 22+).

## Roadmap

Direction for the system beyond the current guide, roughly in order:

1. **Audit tickets.** Work through the tracked backlog: standardize submit buttons on gt-loading-button, promote gt-empty-state, fix the deprecated gt-form-error input, then the medium/low items.
2. **API-table sync check.** The properties tables in the guide are hand-written; add a small check (script or agent step) that diffs each component's `input()`/`output()` signatures against its documented `api` rows so the docs cannot silently drift.
3. **Visual regression.** Screenshot the guide's pages in CI (Playwright) and diff on merge requests, so token or component changes show up as reviewable image diffs.
4. **Brand tokens partial.** The Brand section is live in the guide (Product | Brand toolbar tabs): marketing shares the product's Material theme and adds display typography (`.marketing-heading` scale), the `.fancy` italic accent, and two accent tokens (`--mkt-accent-blue/yellow`). Those brand styles are currently mirrored into the preview's stylesheet; extract them into a shared partial that both marketing and the preview import so there is a single source.
5. **Design-system assistant.** Defined in `ASSISTANT.md`: a chat assistant over the structured registry, preview files, tokens, and this document, answering the long-tail questions ("which component for X?", "how does this behave on mobile?") so the written docs stay lean while depth is on demand. Near term it is a Claude Project / GPT fed those files; later an "Ask" panel in the hosted guide. This is what lets us document principles and canonical examples rather than every edge case by hand.
6. **Storybook evaluation.** Revisit if the guide passes ~25 components or a designer joins who needs an interactive controls panel; the content (tokens, guidance, API rows) ports to Storybook MDX either way.
