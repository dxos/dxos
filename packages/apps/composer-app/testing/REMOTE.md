# Remote QA run — prompt for a cloud agent

Paste the block below as the task for a Claude Code cloud session (a scheduled routine or a
one-off remote session) on the `dxos/dxos` repository. It runs one QA script from
`packages/apps/composer-app/testing/scripts` against a dev server inside the sandbox, drives it
through the agent debug port from a headless Chromium, and files the report. Everything it needs is
in the repo; the sandbox has no display, so the browser is headless and there is no Browser pane.

Fill in the script (and optionally a chapter) before pasting.

---

```text
Run the Composer QA script `basics` (all chapters) and file a report.

You are in the Claude Code cloud sandbox: read `.agents/skills/cloud-sandbox/SKILL.md` first
(tooling, proxy, headless Chromium), then `.agents/skills/qa/SKILL.md` and
`packages/apps/composer-app/testing/scripts/README.md`. The script is
`packages/apps/composer-app/testing/scripts/basics.md`.

Environment, in order:

1. Confirm `moon` runs (`pnpm exec moon --version`). If the toolchain plugin cannot load (the
   cloud-sandbox skill's `plugin::loader::registry::load_failure`), stop and report that the
   sandbox cannot build; do not improvise a build.
2. Start the QA dev server in the background and wait for it (first start builds the graph, budget
   15 minutes):
     DX_DEBUG_PORT_SESSION=$(node -e 'console.log(crypto.randomUUID())') \
       pnpm exec moon run composer-app:serve-qa -- --port 5182 --strictPort --host 127.0.0.1 > /tmp/qa-server.log 2>&1 &
   Choosing the session yourself (DX_DEBUG_PORT_SESSION) means you never need the sidecar.
   Wait until `curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:5182/` prints 200.
3. Open the app in the repo's headless browser helper, which stays alive for the whole run.
   Loopback is unproxied, so localhost needs no proxy flags; a headless page counts as visible, so
   boot is not gated. The sandbox ships an older Chromium than Playwright's pin, so point the helper
   at it:
     PW_CHROMIUM_PATH=/opt/pw-browsers/chromium \
       node packages/apps/composer-app/testing/scripts/bin/qa-browser.mjs http://127.0.0.1:5182/ > /tmp/qa-browser.log 2>&1 &
   Wait for `mounted` in /tmp/qa-browser.log. If the app never mounts, attach the log to the
   report and stop.
4. Drive every step through the port exactly as the README's notation translates it:
     node .agents/skills/composer-forensics/scripts/composer-recovery.js --session "$DX_DEBUG_PORT_SESSION" '<snippet>'
   with COMPOSER_RECOVERY_TIMEOUT=600000 on every call. Never kill a call while a snippet is
   pending. If `composer.snapshot` is missing, enable the debug plugin first
   (`org.dxos.operation.registry.enablePlugins { ids: ["org.dxos.plugin.debug"] }`).

The run:

- Take `<start>` before the first step and pass it as `since` to every snapshot.
- Establish each chapter's Given from a snapshot; abort a chapter whose Given cannot be met and
  say which precondition failed.
- Run the chapters in order, one operation call per Agent line, judging every Expect from a
  snapshot or a query operation, never from a return value. Run each chapter's Teardown even when a
  step failed.
- Chapter 4 needs an AI provider; if the prompt operation fails for lack of one, report the chapter
  as blocked, not failed, with the error text.
- Write the report to `packages/apps/composer-app/testing/reports/<YYYY-MM-DD-HHMM>-basics.md` from
  `../reports/TEMPLATE.md`, and include /tmp/qa-browser.log's error lines and the server's stderr
  under "Server log". Reports are gitignored, so commit it with `git add -f` on this branch and
  push, so the run leaves an artifact.
- When the app contradicted the script (a key moved, a return shape changed), fix the script in
  the same commit and say what changed in the report's Findings.
- Finish by stopping the server and the browser you started, and reply with the step table and the
  report path. A defect is reported, not fixed, unless the task says otherwise.
```

---

## Why this works remotely

- The debug port is loopback (`127.0.0.1:9321`): the page polls it, the recovery script serves it,
  and neither leaves the container. The sandbox's egress proxy does not apply to loopback.
- `DX_DEBUG_PORT_SESSION` fixes the session id up front, so the agent does not depend on the
  `temp/debug-port.json` sidecar or on reading the server log.
- A headless Chromium page is "visible" as far as timers and `requestAnimationFrame` are concerned,
  so the app boots without anyone fronting a tab.
- The snapshot operation (`org.dxos.operation.debug.snapshot`) carries the state the script judges
  by — layout, planks and their comments, spaces, toasts, errors since a timestamp — so no page
  scripting is needed.

## Scheduling

A routine is the same prompt on a schedule (Claude Code scheduled tasks, or a CI job that starts a
cloud session). Pick a chapter subset for a quick smoke (`basics 1`) and the full script for a
nightly run. Keep the reports committed on a dedicated branch or read them from the session's
transcript; the `Findings` section is what a human reviews.
