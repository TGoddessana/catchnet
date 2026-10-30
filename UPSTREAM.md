# Keeping catchnet in step with GlitchTip

catchnet follows the GlitchTip frontend. This page says where catchnet differs and how to bring upstream changes in.

## Remotes and branches

- `upstream` is `https://gitlab.com/glitchtip/glitchtip-frontend.git`.
- catchnet work happens on `catchnet/*` branches. `catchnet/foundation` holds the redesign.

## Merging upstream

```bash
git fetch upstream
git switch catchnet/foundation
git merge upstream/master
```

Then run `npm run lint`, `npx ng test --watch=false`, `npm run i18n`, and look at the issue list, issue detail and settings in light and dark.

## Where catchnet differs

Most of the difference is in the theme layer, which upstream rarely touches:

| Area | Files | Conflict risk |
| --- | --- | --- |
| Tokens, fonts, shared patterns | `src/assets/styles/_tokens.scss`, `_catchnet-fonts.scss`, `_catchnet-patterns.scss` (catchnet only) | none |
| Material overrides | `src/assets/styles/material-overrides/*` | low |
| Global styles | `src/styles.scss`, `_variables.scss`, `_font-files.scss` | low |
| Sidebar | `src/app/main-nav/main-nav/*`, `main-nav/jump-to/*` (new) | high: rebuilt |
| Issue list | `src/app/issues/issues-page/*`, `issues.service.ts` (`updateStatusForIssues`) | high: rebuilt |
| Issue detail | `src/app/issues/issue-detail/issue-detail.component.*`, `issue-detail-tags/*` | high: rebuilt |
| Settings shell | `src/app/settings/routes.ts`, `settings-shell/*` (new) | medium |
| Page headers | `list-elements/list-app-bar/*.scss`, `list-title`, `shared/top-app-bar/*.scss` | low |
| Copy and small color fixes | event detail entries, uptime, settings partials | low |
| Brand | logo and favicon files, `index.html`, login and invite templates, `app.routes.ts` title | low |

For the rebuilt files, take upstream's logic (services, inputs, permission gates) and keep catchnet's template and styles. The components keep upstream's inputs, outputs and service calls, so most upstream changes there are logic changes that port across directly.

## Not changed

The marketing site (`projects/marketing`), the backend, LICENSE and NOTICE.md.
