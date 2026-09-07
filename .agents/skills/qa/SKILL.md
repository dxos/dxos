---
name: qa
description: >-
  Run a Composer QA script from `packages/apps/composer-app/testing/scripts` against a dev server
  you start, driving each step as operation calls through the agent debug port, judging by the UI
  snapshot, and writing a per-run report. Use when asked to QA Composer, to run a testing script or
  chapter, or when `/qa` is invoked. For a plugin's `flow QA-n` blocks use `running-qa-flows`; for
  ad-hoc probing of a live page use `composer-debug`.
---

# Composer QA runs

A script is a plain-markdown journey through the app, split into chapters; you are the agent actor
and the report is the deliverable. Read `testing/scripts/README.md` first — it defines the step
anatomy, the agent notation and its one-line translation into a port call, and what the snapshot
reports.

## 1. Pick the script

`/qa` with no arguments lists `packages/apps/composer-app/testing/scripts/*.md` (excluding the
README) as a numbered list and asks which to run; a number, a script name, or `<script> <chapter>`
skips the question. Read the whole chapter before starting, including every `Given` and the
`Teardown` — a `Given` you cannot establish means abort and say which, not improvise.

## 2. Consent

A script mutates by definition, so the read-only default of `composer-debug` does not apply. It
runs against a **disposable profile on a dev server you start** (§3), never against the user's own
Composer, so consent is at script granularity: the user picking the script is the approval.
Running against any other origin — a port you did not start, `composer.space` — needs an explicit
yes for that origin.

## 3. Start the server and open the port

Through the Browser pane, `preview_start` with the `composer-qa` launch configuration starts
`moon run composer-app:serve-qa` on port 5182 and opens a tab; from a shell the same task, in the
background:

```bash
moon run composer-app:serve-qa -- --port 5182 --strictPort &
```

**Run the page in the headless browser helper, not the Browser pane.** The pane's tab is hidden
whenever the user is not looking at it, and a hidden page boots slowly or not at all; a headless
Chromium page counts as visible and mounts in seconds. Close the pane's tab first (two pages would
share the port's session), then, in the background from the repo root:

```bash
node packages/apps/composer-app/testing/scripts/bin/qa-browser.mjs http://localhost:5182/ &
```

It prints `mounted` once the app is up and page errors as `[page] …`; it stays alive until you stop
it. The headless profile is fresh every launch, so its Given always starts from a clean default
space, and the debug plugin needs enabling on it (below).

`DX_DEBUG_PORT=true` (set by the task) mints a session as the app boots and publishes it to
**`temp/debug-port.json` at the repo root** (`{ session, pid, port, url }`), written once when the
server starts listening — do not delete it to "wait for a fresh one". The server's own log prints
the same id as `Debug port session: <uuid>` (`preview_logs` with `search`), which is the reliable
read. The task builds the app's dependency graph first, which takes minutes on a cold worktree.

**Wait for the mount, not for the port.** The port answers while the app is still on the boot
screen. Wait for the helper's `mounted` line (or, in a pane tab, front it and poll
`document.querySelectorAll('[data-scope]').length > 0` from `javascript_tool`). Never leave a port
call pending while the app is still booting: it will time out and wedge the loop (below). If
`composer.snapshot` is missing, the debug plugin is not enabled on this profile:
`invoke org.dxos.operation.registry.enablePlugins { ids: ["org.dxos.plugin.debug"] }` and wait for
it to appear.

If 5182 is already listening, it is someone's server: check whose worktree it serves before
reusing it (`lsof -a -p <pid> -d cwd -Fn`) and never kill it. Pick another port with `--port` if in
doubt.

Every step goes through the port:

```bash
node .agents/skills/composer-forensics/scripts/composer-recovery.js --session <uuid> '<snippet>'
```

**Give each call a long timeout and never kill it while a snippet is pending.** The page runs one
snippet at a time and re-posts a finished result until a server accepts it; a caller killed
mid-flight leaves the loop wedged on that result and every later call times out. The first
mutation on a cold server (the first `space.create`, say) can take minutes while lazily-loaded
modules activate — set `COMPOSER_RECOVERY_TIMEOUT` to ten minutes and wait. If the port does wedge,
restart its loop in the page with the same session (from the Browser pane's `javascript_tool`)
rather than reloading, which would discard the session:

```js
dxos.debugPort.stop();
dxos.debugPort.start({ session: '<uuid>', persist: true });
```

A page reload stops the port. Restart the server rather than reloading, and re-read the sidecar.

## 4. Run the chapter

1. **Note the run.** Pick a `<runId>` and take `<start>` (`Date.now()`) before the first step, so
   every `snapshot { since: <start> }` reports only this run's errors.
2. **Establish `Given`** from a snapshot; abort on an unmet precondition. Check the chapter's own
   artifacts (`QA:` prefix) are absent even when `Given` does not say so — a leftover from an
   unfinished teardown makes an existence check pass having done nothing.
3. **Run the steps in order**, each **Agent** line as one port call in the README's translation.
   Capture the fields the script names; they are strings (ids, DXNs, paths) by design.
4. **Judge `Expect` from a snapshot or a query operation**, never from an invocation's return value,
   and record the observed value with the verdict.
5. **Watch the errors.** A non-empty `errors` in any snapshot is a finding even when the step's own
   check passed. Once per chapter also read the server's output (`preview_logs`) and, in the
   Browser pane, `read_console_messages` with `onlyErrors`.
6. **Run `Teardown`** unless asked for a partial run. It removes only what this run created, by
   identity, through operations (never `db.remove`, which leaves planks pointing at nothing). When
   it is skipped, say so in the report next to the result, list what remains by name, and give the
   calls that remove it.

Continue past a failed step when later steps do not depend on it; stop the chapter when they do,
and run the teardown regardless.

## 5. Report

Copy `packages/apps/composer-app/testing/reports/TEMPLATE.md` to
`packages/apps/composer-app/testing/reports/<YYYY-MM-DD-HHMM>-<script>.md` and fill it as you go,
not at the end: one row per step with pass / fail and the observed value, the snapshot errors per
step, teardown status, findings, and anything relevant from the server log. Reports are gitignored;
say where the file is in the reply and paste the step table.

A failure is reported as `<script> <chapter>.<step>` with expected and observed side by side.
Never mark a step as passing because the invocation returned without throwing.

## 6. Feed findings back

A script that was wrong about the app — a key that moved, a return shape that changed, a step that
needs a second operation — is a finding, not a failure to hide. Update the script to the verified
form and say what changed in the report. A defect in the app goes to the user with the step that
exposed it; fix it only when asked. When a check needs state the snapshot does not report, extend
the snapshot operation rather than scripting the page.

## 7. Stop what you started

Stop the browser helper and the server you started (`preview_stop`, or the background tasks) when
the run is done, and tell the user the port is closed. Leave a server you did not start alone.

## Checklist

```markdown
- [ ] Script and chapter read in full, including Given and Teardown
- [ ] Server started by me on a disposable profile; page opened in the headless helper and mounted
- [ ] runId and start timestamp noted; debug plugin active
- [ ] Given verified from a snapshot, QA: artifacts confirmed absent
- [ ] Each step one operation call; each Expect judged from a snapshot or query
- [ ] Server log and console checked once per chapter
- [ ] Teardown run through operations, or its skip stated with what remains
- [ ] Report written to testing/reports and summarised in the reply
- [ ] Script corrected where the run contradicted it
- [ ] Server stopped
```
