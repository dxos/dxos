# Routine: Composer QA — run the tagged suites and file a report

A Claude Code cloud Routine (or a one-off remote session) that runs the `suite` blocks carrying a
tag — `smoke` after every merge, `nightly` once a day — against a dev server inside the sandbox,
drives them through the agent debug port from a headless Chromium, and commits the report on the
`qa` branch. Everything it needs is in the repo; the sandbox has no display, so the browser is
headless and there is no Browser pane.

| Trigger | Tag       | Schedule (UTC)  | What it covers                                      |
| ------- | --------- | --------------- | --------------------------------------------------- |
| nightly | `nightly` | `0 3 * * *`     | `smoke`, `basics`, `editor` — no AI provider needed |
| merge   | `smoke`   | on push to main | `APP.mdl` QA-1 only, about five minutes             |
| by hand | any       | fired with text | e.g. `--tag ai` where a provider is configured      |

## Trigger configuration

- **Environment:** the repository's cloud environment, setup command
  `bash .config/claude-code-setup.sh`. The run needs `moon` (proto) and Chromium; where the
  toolchain cannot install (the sandbox's egress policy answers 403 to `moonrepo.dev` or the ghcr
  blob host), the run reports itself blocked rather than improvising a build.
- **Schedule:** as above, fresh session per fire. The prompt's first line names the tag; a manual
  fire appends `--tag <tag>` or `--suite <name>` to override it.
- **Branch:** the session starts on `qa` (`source_revision: qa`, `outcome_branch: qa`), which the
  prompt syncs from `main` before doing anything. `qa` carries only reports; specs are never edited
  on it.
- **Prompt:** the block below, verbatim.

Registering the triggers is tracked in `packages/reflect/deus/TASKS.md`.

---

```text
Run the Composer QA suites tagged `nightly` and file a report. Work autonomously — nobody is
watching, so do not ask questions; when something blocks the run, record it in the report and stop.

You are in the Claude Code cloud sandbox: read `.agents/skills/cloud-sandbox/SKILL.md` first
(tooling, proxy, headless Chromium), then `.agents/skills/composer-qa/SKILL.md` — it is the runbook
and this prompt does not restate it — and `packages/apps/composer-app/testing/README.md`. The
tests are `test QA-n` blocks in `packages/apps/composer-app/spec/APP.mdl` and in the plugins'
`PLUGIN.mdl`; the suites and their tags are enumerated by
`node tools/claude/plugins/dxos/scripts/list-tests.mjs --suites`, and the selection for this run by
`node tools/claude/plugins/dxos/scripts/list-tests.mjs --tag nightly` (a `--tag` or `--suite` on
the message that fired you overrides the tag in this prompt).

Branch, first:

1. You are on `qa`. Sync it from main: `git fetch origin main qa && git merge --no-edit origin/main`.
   A conflict can only come from a report file; keep both sides. Record `git rev-parse --short
   origin/main` — the report is about that commit.

Environment, in order:

2. Confirm `moon` runs (`pnpm exec moon --version`). If the toolchain plugin cannot load (the
   cloud-sandbox skill's `plugin::loader::registry::load_failure`) or proto could not install,
   write the report with Result **blocked** and the exact error, commit it (step 7), and stop.
3. Choose the debug-port session up front and export it, so the same shell passes it to every
   later command:
     export DX_DEBUG_PORT_SESSION=$(node -e 'console.log(crypto.randomUUID())')
   Start the QA dev server in the background, keeping its PID (first start builds the graph, budget
   15 minutes):
     pnpm exec moon run composer-app:serve-qa -- --port 5182 --strictPort --host 127.0.0.1 > temp/qa-server.log 2>&1 &
     SERVER_PID=$!
   Wait until
   `curl -s -o /dev/null -w '%{http_code}' --connect-timeout 2 --max-time 5 http://127.0.0.1:5182/`
   prints 200 — in a background `until` loop bounded to 15 minutes that also stops when
   `kill -0 $SERVER_PID` fails. The two curl timeouts are what keep the loop's own deadline
   meaningful: an unbounded probe against a half-open socket blocks past it.
   Deadline passed or process gone: write the report with Result **blocked** and the last 40 lines
   of temp/qa-server.log, then go to step 7 and step 9.
4. Open the app in the repo's headless browser helper, which stays alive for the whole run; the
   sandbox ships an older Chromium than Playwright's pin, so point the helper at it:
     PW_CHROMIUM_PATH=/opt/pw-browsers/chromium \
       node packages/apps/composer-app/testing/bin/qa-browser.mjs http://127.0.0.1:5182/ > temp/qa-browser.log 2>&1 &
     BROWSER_PID=$!
   Wait for `mounted` in temp/qa-browser.log, bounded to 5 minutes and stopping early when
   `kill -0 $BROWSER_PID` fails. If the app never mounts, attach the log to the report as blocked
   and go to step 7 and step 9. Then wait until a port probe returns true —
   `return typeof dxos !== 'undefined' && dxos.client.spaces.get().some((s) => s.state.get() === 3)`
   — bounded to 5 more minutes; the client initializes after the mount.
5. Drive every step through the port exactly as the skill describes, with
   COMPOSER_RECOVERY_TIMEOUT=600000 on every call and never killing a call while a snippet is
   pending. If `composer.snapshot` is missing, enable the debug plugin first.

The run:

6. Take `$runId` and `$start` before the first step. For each test the tag selects, in listed
   order: establish `given` from a snapshot (abort that test, not the run, on an unmet
   precondition and say which), run `before`, `steps`, `after` — one operation per step through
   the invoker, a snapshot after every step, every `expect` judged from the snapshot or a query,
   never from a return value — and run `after` even when a step failed. Continue past a failed
   test; list any test not reached as `not run`. A test needing an AI provider that the app
   cannot reach is `blocked` with the error text, not failed.

The report:

7. Write `packages/apps/composer-app/testing/reports/<YYYY-MM-DD-HHMM>-<tag>.md` from
   `../reports/TEMPLATE.md`, with the header filled from this run — the `origin/main` commit and
   the `qa` commit, the start time in UTC, `cloud-sandbox` with `node --version` and `uname -sr`,
   the server task and URL, the run id — then one section per test, the drained errors,
   the `after` status, findings, and the error lines of temp/qa-browser.log and the server's
   stderr under "Server log". Reports are gitignored, so stage it with `git add -f`, commit as
   `qa: <YYYY-MM-DD> <tag> — <n>/<m> tests pass` and `git push -u origin qa`.
8. Do not edit a spec on `qa`. When a test was wrong about the app (a key moved, a return shape
   changed), say exactly what in Findings so a human can fix the spec on main; when the app is
   wrong, say which step exposed it and the observed value. Fix nothing.
9. Finish by stopping the browser and the server you started (`kill $BROWSER_PID $SERVER_PID`,
   then confirm nothing listens on 5182), and reply with the per-test summary table and the
   report path.
```
