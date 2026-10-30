# catchnet monorepo

- `frontend/` and `backend/` are git subtrees of the GlitchTip projects. Read `frontend/CLAUDE.md` before frontend work and `backend/CLAUDE.md` before backend work; their rules (clean-room development, the AI policy, permission gating) apply here too.
- Bring upstream changes in with `git subtree pull` as described in `UPSTREAM.md`, never by copying files.
- Conventional commits; scope a commit to `frontend` or `backend` work where it can be.
