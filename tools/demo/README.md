# Composer agent demo

One command gets you from a clean repo to a recording-ready workspace:

```bash
pnpm demo
```

The first time, run the interactive setup instead:

```bash
pnpm demo --setup        # walks you through .env.demo with links
pnpm demo                # the real thing
```

## What happens when you run it

1. **Pre-flight.** Pings Anthropic / Trello / Slack / GitHub with the lightest
   possible call. If Anthropic or Trello credentials are bad, we bail; the
   rest are optional (Granola, Slack, GitHub are logged as "missing" but not
   fatal).
2. **Dev server.** If nothing is answering at `http://localhost:5173`, we
   start `moon run composer-app:serve` in the background. Logs land in
   `tools/demo/logs/`.
3. **Trello fixture.** On `--populate` or `--fresh`, we ensure the board at
   `TRELLO_BOARD_ID` has the four demo lists and eight cards. Idempotent.
4. **Viewer surfaces.** Open Trello and GitHub as tabs in your **main Chrome**
   (so existing logins, cookies, and extensions are reused) and bring Slack
   desktop app to the front. Your Playwright Chromium is only for Composer.
5. **Window layout.** Composer on the left half of the primary display, your
   main Chrome on the right half, Slack floating. (macOS only.)
6. **Composer bootstrap.** Inject `.env.demo` into `localStorage`, seed
   plugin settings, wait for `window.__DEMO__`, call `__DEMO__.bootstrap()`
   (registers schemas, seeds fixtures, wires real Trello/Granola).
7. **Act 2 — drift.** Move the "Onboarding redesign" card from Done → In
   Progress via Trello REST so the demo has something for the agent to react
   to. Skipped under `--dry`.
8. **Act 3 — PR detection.** `__DEMO__.pollGithub()` hits your real repo and
   emits a `DemoEvent(kind='pr-merged')` for any new merge. The plugin's
   observer writes a `DemoNudge` (and posts to Slack if `DEMO_LIVE_SLACK=true`).
9. **Ready banner.** Browser stays open. Ctrl+C to shut everything down.

## Flags

| Flag | Effect |
|---|---|
| `--setup` | Interactive wizard for `.env.demo`. Prompts for each variable with a link to where to get it. Writes `.env.demo` (mode 0600). |
| `--fresh` | Wipe the Playwright persistent profile; reruns re-populate Trello. |
| `--dry` | No real Slack posts (`DEMO_LIVE_SLACK` forced off). No Trello card moves. Pre-flight still runs. |
| `--setup-only` | Load credentials + open windows + position them, then stop. Useful for manual rehearsal. |
| `--populate` | Force re-populate Trello even if cards already exist. |
| `--record` | Start a macOS `screencapture` alongside the run. Video lands in `tools/demo/recordings/`. Requires Screen Recording permission for your terminal. |

## Switching fixtures

Fixtures live in `tools/demo/fixtures/<id>.json`. The default is `widgets`.
To swap:

```bash
DEMO_FIXTURE=your-id pnpm demo
```

Each JSON has `{ boardName, lists, cards, drift }`. The `drift` block tells
step 7 which card to move and where.

## Secrets

- `.env.demo` — your real credentials. **Gitignored.** Never commit.
- `.env.demo.example` — the template.
- `tools/demo/playwright-user-data/` — Chromium profile (identity + IndexedDB
  for the persistent Composer session). Gitignored.
- `tools/demo/logs/` and `tools/demo/recordings/` — generated output.

## Troubleshooting

- **"Missing required credentials: Anthropic, Trello"** — run `pnpm demo --setup`
  or edit `.env.demo`.
- **"Schema not registered"** in browser console — happens on a space that
  predates newer plugins. The plugin registers schemas on first API call;
  refresh and retry.
- **Dev server keeps timing out** — check `tools/demo/logs/dev-server-*.log`.
  The first Vite cold-start on a fresh checkout can take 60-90 seconds.
- **`__DEMO__` is undefined** — you probably opened the app from a different
  worktree. Make sure `composer-app:serve` is running from
  `.claude/worktrees/composer-agent`, not `~/src/dxos`.

## Advanced / low-level commands

All still available for surgical work:

```bash
pnpm --filter @dxos/demo-setup populate-trello   # Trello fixture only
pnpm --filter @dxos/demo-setup setup             # legacy: inject creds, no orchestration
pnpm --filter @dxos/demo-setup run               # legacy orchestrator (superseded by demo.ts)
pnpm --filter @dxos/demo-setup reset             # wipe Playwright profile
```

## Extending

To add a new credential:

1. Add the key to `.env.demo.example`.
2. Add the key to `LOCAL_STORAGE_KEYS` in `lib/localstorage.ts`.
3. If a plugin reads it as structured settings, add a `PluginSeeder` to
   `lib/plugin-settings.ts`.
4. If it calls out to an external service during pre-flight, add a check to
   `lib/preflight.ts`.

To add a new demo fixture: drop a JSON file into `tools/demo/fixtures/` with
the same shape as `widgets.json`, then run `DEMO_FIXTURE=<id> pnpm demo`.
