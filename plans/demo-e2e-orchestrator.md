# Demo end-to-end orchestrator

Goal: one command that exercises the full Composer-agent story against real
Trello / GitHub / Slack, suitable for screen recording.

## Phase 1 (this PR)

### 1. Make nudges actually post to Slack

`DemoPanel.tsx` currently creates `DemoNudge` objects with `posted=false` and
renders "preview · not posted to real Slack". Gate real posting on a
localStorage flag so rehearsals stay dry-run by default.

- Flag: `localStorage.DEMO_LIVE_SLACK === 'true'`
- Creds: `SLACK_BOT_TOKEN` + channel from `SLACK_NUDGE_CHANNEL`
  (falls back to first entry in `SLACK_CHANNELS`).
- On post success → `Obj.change(nudge, m => { m.posted = true; m.postedAt = now })`.
- On failure → log, leave `posted=false`.

### 2. Orchestrator script `tools/demo/run.ts`

Launches Chromium with the persistent profile, then drives:

1. Inject `.env.demo` into localStorage (reuse setup logic — refactor into
   `tools/demo/lib/inject-localstorage.ts`).
2. Navigate to Composer, wait for space.
3. If no Demo Controls object, create one via `window.__DEMO__` (not UI —
   fewer moving parts than the picker).
4. Call `window.__DEMO__.bootstrap()` (registers schemas + seeds fixtures).
5. Populate real Trello (call existing `populate-trello` logic as a function).
6. Move a Trello card from Done → In Progress via REST — simulates the
   "drifted card" trigger.
7. Call `window.__DEMO__.pollGithub()` to pull a real merged PR.
8. Wait for a `DemoNudge` to appear (poll `__DEMO__.status()`).
9. If `DEMO_LIVE_SLACK=true` in .env.demo, assert nudge.posted===true.
10. Open a second Playwright page to `https://app.slack.com/` so the posted
    message is visible for recording.
11. Leave browser open on SIGINT.

Screenshots: take one after each step into `tools/demo/screenshots/<step>.png`
for debugging.

### 3. Scripts + docs

- `pnpm --filter @dxos/demo-setup run run` → runs orchestrator
- README: add "End-to-end run" section.
- Add `DEMO_LIVE_SLACK` to `.env.demo.example`.

## Phase 2 (future)

- macOS screen recording: `screencapture -v -V <duration>` or
  `ffmpeg -f avfoundation -i "1:0" out.mp4`. Wrap start/stop around the run.
- Animate cursor (Playwright has no native mouse-animation; tiny helper that
  `mouse.move()` in steps).
- Voice-over audio track (pre-recorded wav composited in post).
