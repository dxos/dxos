---
name: composer-qa
description: >-
  Run the executable QA of a `.mdl` spec — a `test QA-n`, a `suite`, or every suite carrying a tag —
  against a Composer dev server you start, driving each step as one operation call through the
  agent debug port, judging every step by the UI snapshot, and writing a per-run report. Use when
  asked to QA Composer, to run a plugin's `## QA` section, to verify a change end to end against
  the real app rather than a test runner, or when `/dxos:qa` is invoked. For ad-hoc probing of a
  live page use `composer-debug`; to record a walkthrough as video use `recording-demos`.
---

# Composer QA runs

A `test` is a written plan that a human and an agent execute from the same source: the human
reads `do:`, you `invoke:` and evaluate `assert:`, both judge `expect:`. The language is
[`packages/reflect/deus/lang/qa.mdl`](../../../packages/reflect/deus/lang/qa.mdl) — read it once;
its Execution Rules are the contract this skill implements, and every rule there cost a false
failure before it was written down. Tests live in the `## QA` section of a `PLUGIN.mdl`, or in
`packages/apps/composer-app/spec/APP.mdl` for journeys that cross plugins; `suite` blocks group
them and carry the tags a Routine selects by.

**Sibling skills.** [`composer-debug`](../composer-debug/SKILL.md) is the transport reference —
the port protocol, what is in scope, snippet rules and the gotchas — with a read-only posture on
the user's own profile. This skill is the mutating runbook on a disposable profile, so its consent
model differs (§2) and it starts its own server (§3). [`recording-demos`](../recording-demos/SKILL.md)
drives the same tests for a video rather than a verdict.

## 1. Pick what to run

`/dxos:qa` enumerates with the plugin's own script, never by grepping — the numbering is the
addressing scheme:

```bash
node tools/claude/plugins/dxos/scripts/list-tests.mjs                 # every test, numbered
node tools/claude/plugins/dxos/scripts/list-tests.mjs markdown QA-1   # exactly one
node tools/claude/plugins/dxos/scripts/list-tests.mjs --suites        # every suite, with tags
node tools/claude/plugins/dxos/scripts/list-tests.mjs --tag nightly   # the tests a tag selects
```

Read each test in full before starting: `given`, all three stages, and every `note` — a `note` is
a constraint on how the step must be run, not commentary, and ignoring one produces a false
failure. A `given` you cannot establish means abort and say which, not improvise.

## 2. Consent

A test mutates by definition, so the read-only default of `composer-debug` does not apply. It runs
against a **disposable profile on a dev server you start** (§3), never against the user's own
Composer, so consent is at test granularity: the user naming the test, suite or tag is the
approval. Running against any other origin — a port you did not start, `composer.space` — needs an
explicit yes for that origin, and a summary of what the test will change first.

## 3. Start the server and open the port

Choose the port session and the HTTP port up front and export both, so every later command in the
same shell passes them and you never depend on the sidecar. `QA_PORT` is one variable because the
port appears in five places — serve, the readiness probe, the helper's URL, the reuse check and the
teardown — and a run that changes it in four of them fails in a way that reads as a boot problem:

```bash
export DX_DEBUG_PORT_SESSION=$(node -e 'console.log(crypto.randomUUID())')
export QA_PORT=5182
moon run composer-app:serve-qa -- --port "$QA_PORT" --strictPort --host 127.0.0.1 > temp/qa-server.log 2>&1 &
SERVER_PID=$!
```

`serve-qa` sets `DX_DEBUG_PORT=true`, which mints a session as the app boots and starts the port
from `main.tsx`; without `DX_DEBUG_PORT_SESSION` the id lands in `temp/debug-port.json`
(`{ session, pid, port, url }`) and in the server log as `Debug port session: <uuid>`. The first
start builds the app's dependency graph, which takes minutes on a cold worktree; wait until
`curl -s -o /dev/null -w '%{http_code}' --connect-timeout 2 --max-time 5 "http://127.0.0.1:$QA_PORT/"`
prints 200. Bound every probe like that: an unbounded `curl` against a half-open socket hangs the
loop it is in, which then reads as a slow build. Through the Browser pane, `preview_start` with the
`composer-qa` launch configuration is the same task on the same port.

If `$QA_PORT` is already listening, it is someone's server: check whose worktree it serves before
reusing it (`lsof -a -p <pid> -d cwd -Fn`) and never kill it. Pick another port if in doubt.

**Open the page in the headless helper, not a pane tab.** A hidden tab boots slowly or not at all
(boot is visibility-gated); a headless Chromium page counts as visible and mounts in seconds on a
fresh profile:

```bash
node packages/apps/composer-app/testing/bin/qa-browser.mjs "http://127.0.0.1:$QA_PORT/" > temp/qa-browser.log 2>&1 &
BROWSER_PID=$!
```

It prints `mounted` once the app is up and page errors as `[page] …`, and stays alive until
killed. In the cloud sandbox point it at the image's Chromium with
`PW_CHROMIUM_PATH=/opt/pw-browsers/chromium` (see the `cloud-sandbox` skill). The headless profile
is fresh every launch, so `given` always starts from a clean default space.

**Wait for the mount, then for the client.** The port answers while the app is still on the boot
screen, and a call left pending during boot times out and wedges the loop. `mounted` is not enough
either: the `dxos` hook is installed at the end of `client.initialize()`, and on a cold profile
that can be a minute after the mount (the shared-worker leader session times out once and is
re-elected). Poll a cheap probe until it returns `true`, then establish `given`:

```js
return typeof dxos !== 'undefined' && dxos.client.spaces.get().some((s) => s.state.get() === 3); // SPACE_READY
```

Every call goes through the port:

```bash
COMPOSER_RECOVERY_TIMEOUT=600000 node .agents/skills/composer-forensics/scripts/composer-recovery.js \
  --session "$DX_DEBUG_PORT_SESSION" '<snippet>'
```

**Give each call a long timeout and never kill it while a snippet is pending.** The page runs one
snippet at a time and re-posts a finished result until a server accepts it; a caller killed
mid-flight leaves the loop wedged on that result. The first mutation on a cold server can take
minutes while lazily-loaded modules activate. If the port does wedge, restart its loop in the page
with the same session rather than reloading, which would discard it:

```js
dxos.debugPort.stop();
dxos.debugPort.start({ session: '<uuid>', persist: true });
```

If `composer.snapshot` is missing, the debug plugin is not enabled on this profile:
`invoke org.dxos.operation.registry.enablePlugins { ids: ["org.dxos.plugin.debug"] }` and wait for
it to appear in `composer.operations()`.

## 4. Run a test

1. **Note the run.** Pick a `$runId` (a short unique string, the start time in base 36 is fine) and
   take `$start` (`Date.now()`) before the first step. Every artifact the test creates carries
   `QA:` and `$runId` in its name; every snapshot takes `since: $start`.
2. **Establish `given`** from a snapshot. Check the test's own artifacts (`QA:` prefix) are absent
   even when `given` does not say so — a leftover from an unfinished `after` makes an
   existence-shaped check pass having done nothing. **Never delete an artifact this run did not
   create**; a name match is not ownership. Abort and say what is in the way. A named `given`
   entry (`space: …`) is a value to resolve and hold as `$given.space`.
3. **Run the stages in order** — `before`, `steps`, `after` — each step as one port call unless
   coalesced (below). `--stage=before|steps|after` runs one; a skipped stage is reported with what
   remains and the command that removes it.
4. **One operation per step, always through the invoker with a `spaceId`.** Do not branch on
   `requires:` — an operation cannot see what its downstream calls need. One helper, used for
   every step, matching the key **exactly** (a suffix match takes `create` for `createDraft`):

   ```js
   const invokeOp = async (key, input, spaceId) => {
     const mgr = composer.manager;
     const sets = mgr.capabilities.getAll({ identifier: 'org.dxos.app-framework.capability.operationHandler' });
     const matches = sets.flatMap((set) =>
       set.definitions().filter((d) => String(d.meta.key).replace(/^dxn:/, '') === key),
     );
     if (matches.length !== 1) {
       throw new Error(`expected exactly one operation for ${key}, found ${matches.length}`);
     }
     const invoker = mgr.capabilities.get({ identifier: 'org.dxos.app-framework.capability.operationInvoker' });
     const { data, error } = await invoker.invokePromise(matches[0], input, { spaceId });
     if (error) {
       throw new Error(String(error));
     }
     return data;
   };
   ```

   `composer.invoke(key, input, { spaceId })` is the same thing when the running build forwards
   the option; the helper is the form that always works. The step's `space:` names the space,
   default `$given.space`, else the default space.

5. **Translate the input literal mechanically.** `$name` is a held value; `$runId` the run's id;
   `Obj("echo://S/O")` → `dxos.spaces('S').db.getObjectById('O')`; `Ref(…)` → `dxos.Ref.make(…)`;
   `Space("S")` → `dxos.spaces('S')`. Placeholders inside strings are substituted as text.
6. **Snapshot after every step**, `composer.snapshot({ since: $start })`, and bind it as
   `$snapshot` for the step's `assert`. Judge `expect` from the snapshot or a query operation,
   **never from the invocation's return value** — a successful invoke routinely did less than the
   step intended (a `create` is a factory and places nothing). Record the observed value with the
   verdict.
7. **Errors are always a finding.** A non-empty `errors` in any snapshot goes in the report against
   the step where it first appeared, even when that step's own check passed. Once per test also
   read the server log and the browser helper's `[page]` lines.
8. **Coalesce adjacent steps that thread a live object.** The port serializes between snippets, so
   an ECHO object captured in one step cannot reach the next; run both in one snippet and say so in
   the report. Captures that are strings (a URI, an id, a path) need no coalescing — prefer them,
   and reach the object again with `Obj(…)`.
9. **Select a document before editing it.** Opening the plank is what binds the editor; an edit
   invoked against an unopened document lands in the database without the surface ever showing
   it. Opening needs a navigation path, which you build:
   `root/<spaceId>/content/collections/<objectId>` for `appToolkit.open { subject: [path] }`.
10. **Continue past a failed step** when later steps do not depend on it; stop the stage when they
    do. **Run `after` regardless**, through operations only — never `db.remove`, which strands a
    plank the user cannot close. `after` removes only what this run created, by identity.

A step with no `invoke` is the human's; in an agent-only run it is reported as `skipped (human)`,
and a test containing one cannot be `actors: agent`. A step that cannot run at all (operation
missing, plugin absent) is `blocked`, with the reason, and so is the test's `status`.

## 5. Run a suite

A suite is order-independent by construction — every test owns its `given`, `before` and `after` —
so run its tests in listed order and **continue past a failed test**, including a failed `after`:
the next test's `given` guards it. Stop early only when the app itself is gone (the port no longer
answers, the page crashed); say so, and list every test not reached as `not run`. One report per
suite run, one section per test.

## 6. Report

Copy `packages/apps/composer-app/testing/reports/TEMPLATE.md` to
`packages/apps/composer-app/testing/reports/<YYYY-MM-DD-HHMM>-<suite or test>.md` and fill it as
you go, not at the end. The header records what was tested: branch and short commit hash, start
time (UTC), the environment (`local` / `cloud-sandbox`, Node version, server task and URL) and the
run id. Then one section per test with one row per step — stage, number, name, pass / fail /
blocked / skipped, observed value — the errors drained per step, and the `after` status.

A failure is reported as `<plugin>:QA-n.<step>` with expected and observed side by side, the step's
`id` in place of its number where it declares one. Never mark a step as passing because the
invocation returned without throwing.

Reports are gitignored, so a local run leaves no diff; say where the file is and paste the step
tables in the reply. A Routine commits its report on the `qa` branch instead (see
`agents/routines/composer-qa.md`).

## 7. Feed findings back

A test that was wrong about the app — a key that moved, a return shape that changed, a step that
needs coalescing — is a finding, not a failure to hide. Update the test to the verified form, set
its `status:` with the date in a comment, and say what changed in the report. A defect in the app
goes to the user with the step that exposed it; fix it only when asked. When a check needs state
the snapshot does not report, extend `packages/plugins/plugin-debug/src/operations/snapshot.ts`
rather than scripting the page — the snapshot is what makes screenshots unnecessary.

## 8. Snapshot on demand

`/dxos:qa snapshot [<since-ms>]` prints the current snapshot of the running QA page as JSON, for the
user's own look at what the agent sees. It is one port call
(`return composer.snapshot({ since })`) against the session in `DX_DEBUG_PORT_SESSION` or
`temp/debug-port.json`; it needs a server and a mounted page (§3) and changes nothing.

## 9. Stop what you started

Stop the browser helper and the server you started (`kill $BROWSER_PID $SERVER_PID`, or
`preview_stop` for a pane-started server), confirm nothing listens on `$QA_PORT`
(`lsof -ti :$QA_PORT -sTCP:LISTEN`), and say the port is closed. `serve-qa` runs vite as a child of
the task runner, so killing `$SERVER_PID` can leave that child holding the port — kill what `lsof`
names. Leave a server you did not start alone.

## Checklist

```markdown
- [ ] Test(s) read in full, including every `given`, stage and `note`
- [ ] Server started by me on `$QA_PORT`, disposable profile; page mounted AND the client ready
- [ ] runId and start timestamp noted; debug plugin active
- [ ] `given` verified from a snapshot; `QA:` artifacts confirmed absent; aborted if unmet
- [ ] Each step one operation through the invoker with a spaceId, key matched exactly
- [ ] Snapshot after every step; each `expect` judged from it or a query, never a return value
- [ ] Errors drained per step; server log and `[page]` lines read once per test
- [ ] Steps threading a live object coalesced and noted
- [ ] `after` run through operations, or its skip stated with what remains
- [ ] Suite continued past failures; unreached tests listed as not run
- [ ] Report written with branch, hash, time, env, run id; tables pasted in the reply
- [ ] Spec updated where the run contradicted it, with `status:` and date
- [ ] Server and browser stopped
```
