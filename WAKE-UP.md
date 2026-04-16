# Morning checklist — record the HN video

Run this from the worktree root:

```bash
pnpm record
```

That's it. The script does three things:

1. Makes sure vite is live on `http://localhost:5173` (already warm right now).
2. Starts a macOS `screencapture` recording to `tools/demo/recordings/`.
3. Runs the demo bootstrap (opens Chromium, seeds fixtures, lays out windows).

Then you walk through the 4-act v2 script:

- **Act 1 (0:00–0:20)** — Cold open: your terminal *is* the cold open. Let the recording catch the last bit of bootstrap output before you start talking.
- **Act 2 (0:20–1:10)** — Phone-to-home. DM the bot in Slack, cmd-tab to Composer, continue the same conversation.
- **Act 3 (1:10–2:20)** — Explain → Fail → Recover. Inspector reasoning line, then trigger a PR merge that matches the wrong card, click "Wrong card?" select, pick the right one.
- **Act 4 (2:20–3:00)** — Disconnect Wi-Fi (OFFLINE banner appears), type in Composer, reconnect, pan to `cross-surface-chat.ts`.

Full pacing notes: `plans/video-script-v2.md`.

When you're done, close the Chromium window or hit Ctrl+C in the terminal — the script will flush the `.mov` and print the path.

## If anything goes wrong

- Vite acts up → `pkill -f vite && pnpm record` (script re-starts vite cleanly)
- Profile feels stale → `rm -rf tools/demo/playwright-user-data && pnpm record`
- `page.goto` timeout → demo.ts now retries internally; just re-run `pnpm record`

## What shipped last night (5 commits pushed to chad/claude/composer-agent)

1. Cross-surface chat mirror (Slack ↔ Composer shared ECHO Chat per thread)
2. aiMatch reasoning as a `> why I matched it: ...` line on every nudge
3. "Wrong card?" select on each nudge for instant correction
4. `plans/video-script-v2.md` — rewritten 4-act script
5. OFFLINE banner for the Wi-Fi yank beat

Plus 3 demo-infra fixes (repo root path, moon binary path, CI env var) and `page.goto` retry hardening.
