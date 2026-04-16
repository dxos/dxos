# Morning checklist — record the HN video

Run this from the worktree root:

```bash
pnpm record
```

That's it. The script does four things:

1. Kills any stale vite/Chromium processes from previous sessions.
2. Starts a fresh vite dev server and **waits until `__DEMO__` actually loads** (not just HTTP 200 — catches the vite dep-reoptimization window).
3. Pauses and tells you to start your screen recording (Cmd-Shift-5). Hit Return when ready.
4. Launches Chromium, bootstraps fixtures, lays out windows.

**Why you start the recording instead of the script:** macOS requires Screen Recording permission per-app, and Terminal doesn't always have it granted. QuickTime/Cmd-Shift-5 prompts you once and then it just works. Cleaner than fighting TCC.

Then you walk through the 4-act v2 script:

- **Act 1 (0:00–0:20)** — Terminal cold open + click **"Morning briefing"** in the demo panel. The agent narrates what happened across all your tools as the opening line. This is the emotional hook — the single most important beat of the video.
- **Act 2 (0:20–1:10)** — Phone-to-home. DM the bot in Slack, cmd-tab to Composer, continue the same conversation.
- **Act 3 (1:10–2:20)** — Explain → Fail → Recover. Inspector reasoning line, then trigger a PR merge that matches the wrong card, click "Wrong card?" select, pick the right one.
- **Act 4 (2:20–3:00)** — Disconnect Wi-Fi (OFFLINE banner), type in Composer, reconnect. Then click **"Draft weekly update"** to show synthesis across surfaces. Finally, pan to the editor showing `packages/plugins/plugin-linear/` — a real Linear plugin scaffold in ~200 lines — with the voiceover *"adding a new work-tool integration is a weekend project, not a months-long rewrite."*

Full pacing notes: `plans/video-script-v2.md`.

When you're done, close the Chromium window or hit Ctrl+C in the terminal — the script will flush the `.mov` and print the path.

## If anything goes wrong

- Anything weird → just re-run `pnpm record`. The script kills stale processes and starts fresh every time.
- Vite fails to boot → check the log path it prints. Usually it means moon can't find a dep; `pnpm install` then retry.
- `page.goto` timeout → demo.ts now retries internally; just re-run `pnpm record`.

## What shipped last night

**From the focus-group polish pass (5 items):**
1. Cross-surface chat mirror (Slack ↔ Composer shared ECHO Chat per thread)
2. aiMatch reasoning as a `> why I matched it: ...` line on every nudge
3. "Wrong card?" select on each nudge for instant correction
4. `plans/video-script-v2.md` — rewritten 4-act script
5. OFFLINE banner for the Wi-Fi yank beat

**From the "make it amazing" round (3 more):**
6. **Morning briefing** — cross-tool synthesis paragraph written to the chat pane (synthesis.ts)
7. **Draft weekly update** — synthesis.ts's second flow; writes a markdown doc to the sidebar
8. **@dxos/plugin-linear** — real Linear GraphQL client + schemas in ~200 lines; proves hackability

Plus 4 demo-infra fixes (repo root path, moon binary path, CI env var, `page.goto` retry hardening) so `pnpm record` is reliable.
