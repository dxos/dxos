# Demo setup tool

Bootstraps a recording-ready Composer session. Opens a fresh Chromium with a
persistent profile, injects credentials from `.env.demo` into localStorage,
and leaves you one button-click away from a fully-wired demo workspace.

## Quick start

```bash
# 1. Configure credentials
cp tools/demo/.env.demo.example tools/demo/.env.demo
$EDITOR tools/demo/.env.demo

# 2. Start Composer dev server
moon run composer-app:serve

# 3. In a second terminal, run the setup
pnpm --filter @dxos/demo-setup install   # first time only
pnpm --filter @dxos/demo-setup setup
```

The script launches Chromium, navigates to `http://localhost:5173`, writes
every non-empty `.env.demo` value into `localStorage`, and reloads.

After the page comes back, inside Composer:

1. Open (or create) a space.
2. Add a **Demo Controls** object (plugin-demo registers the type).
3. Click **Bootstrap from .env.demo (seed + wire credentials)**.
4. The button:
   - Creates the Widgets-team fixture board (8 cards) if absent.
   - Creates a `TrelloBoard` with your real API key + token (or updates the
     existing one).
   - Creates a `GranolaAccount` with your real key (or updates it).
   - Sets `document.body[data-demo-ready]="true"` when done.

Slack and GitHub credentials are stored as-is in localStorage for now — the
corresponding plugins read them directly. Migration to AccessToken is tracked
in `plans/adopt-access-token-for-sync-plugins.md`.

## Populate your Trello board with the fixture

Mirrors the in-Composer Widgets-team fixture onto your real Trello board so
`aiMatch` has the same cards to link against. Uses the Trello REST API — no
browser automation. Idempotent.

```bash
pnpm --filter @dxos/demo-setup populate-trello
```

Ensures four lists (Backlog / In Progress / Review / Done) and eight cards
exist on `TRELLO_BOARD_ID` from `.env.demo`. Re-running is safe — matches by
name, updates descriptions if they drifted.

## Between takes

To start the next take from a clean identity:

```bash
pnpm --filter @dxos/demo-setup reset
pnpm --filter @dxos/demo-setup setup
```

`reset` removes `tools/demo/playwright-user-data/` (also gitignored).

## Secrets

- `.env.demo` — your real credentials. **Gitignored.** Never commit.
- `.env.demo.example` — template, committed.
- `tools/demo/playwright-user-data/` — Chromium profile (identity state,
  IndexedDB). Gitignored via a dedicated rule in the demo directory.

## Extending

To add a new credential:

1. Add the key to `.env.demo.example`.
2. Add the key to `LOCAL_STORAGE_KEYS` in `setup.ts`.
3. Add the key to `BOOTSTRAP_KEYS` in
   `packages/plugins/plugin-demo/src/containers/DemoPanel/bootstrap-from-env.ts`
   and wire it into the bootstrap flow.
