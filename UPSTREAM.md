# Keeping catchnet in step with GlitchTip

catchnet follows both GlitchTip projects. `frontend/` and `backend/` are git subtrees, so an upstream change comes in per folder with its history, and catchnet's own commits sit on top.

## Remotes

```bash
git remote add upstream-frontend https://gitlab.com/glitchtip/glitchtip-frontend.git
git remote add upstream-backend https://gitlab.com/glitchtip/glitchtip-backend.git
```

## Bringing upstream in

Work on a branch, one folder at a time:

```bash
git switch -c chore/upstream-sync
git fetch upstream-backend master
git subtree pull --prefix=backend upstream-backend master
git fetch upstream-frontend master
git subtree pull --prefix=frontend upstream-frontend master
```

Then, in `frontend/`, run `npm run lint`, `npx ng test --watch=false` and `npm run i18n`, and look at the issue list, issue detail, settings and account screens in light and dark. In `backend/`, run `docker compose run --rm web ./manage.py test`.

Do not pass `--squash`: the subtrees were added with full history, and squashed pulls would break later merges.

## Where catchnet differs

The backend is unchanged so far.

The frontend differs almost entirely in templates and styles:

| Area | Files | Conflict risk |
| --- | --- | --- |
| Tokens, fonts, shared patterns | `src/assets/styles/_tokens.scss`, `_catchnet-fonts.scss`, `_catchnet-patterns.scss` (catchnet only) | none |
| Icons | `src/app/shared/icons/*` (catchnet only); every `<mat-icon>` uses `svgIcon` | medium: new upstream icons need a registry entry |
| Material overrides and defaults | `src/assets/styles/material-overrides/*`, `src/main.ts` providers | low |
| Global styles | `src/styles.scss`, `_variables.scss`, `_font-files.scss` | low |
| Shell | `src/app/main-nav/*`, `mobile-nav-toolbar/*` | high: rebuilt |
| Screens | issues, projects, settings, profile, releases, uptime, performance, logs, auth screens | high: templates and styles rebuilt |
| Shared components | `shared/project-table/*` (new), `shared/empty-state`, banners, `list-elements/*` | medium |
| Brand | logo and favicon files, `index.html`, `app.routes.ts` title | low |

For rebuilt files, take upstream's logic (services, inputs, permission gates) and keep catchnet's template and styles. Components keep upstream's inputs, outputs and service calls, so most upstream changes there are logic changes that port across directly. An upstream template that adds a `<mat-icon>name</mat-icon>` must become `<mat-icon svgIcon="name">`, with the name added to `shared/icons/catchnet-icons.ts`.

## Not changed

The marketing site (`frontend/projects/marketing`), the backend, and every LICENSE and NOTICE file.
