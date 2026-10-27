# Composer QA

The app-level QA tests live in [`../spec/APP.mdl`](../spec/APP.mdl) — `test QA-n` blocks in its
`## QA` section and the `suite` blocks that group them — written in the Deus.QA dialect
([`packages/reflect/deus/lang/qa.mdl`](../../../reflect/deus/lang/qa.mdl)). A plugin's own tests
live in its `PLUGIN.mdl`. The `composer-qa` skill (`.agents/skills/composer-qa/SKILL.md`) is the
runbook: it starts a dev server on a disposable profile, opens the page in the headless helper
below, drives every step as one operation call through the agent debug port, judges each step by
the UI snapshot, and writes a report here. `/dxos:qa` is the front door.

This directory holds what a run needs besides the spec:

| Path                  | What                                                                         |
| --------------------- | ---------------------------------------------------------------------------- |
| `bin/qa-browser.mjs`  | Keeps a headless Chromium page on the QA server so the app boots unwatched   |
| `bin/two-user-invite.mjs` | Two identities in separate profiles: Bob invites Alice; reports inbox delivery and EDGE `/inbox` statuses |
| `reports/TEMPLATE.md` | The per-run report; `reports/` is gitignored, a Routine commits on `qa`      |

## Anatomy of a test

A test is three stages of steps — `before` (fixture), `steps` (the test), `after` (teardown) —
each step with a human `do`, an `expect` both actors judge, and for the agent one `invoke` (an
operation key and its input) plus an optional `assert` evaluated in the debug port against
`$snapshot`, the state of the app after the step. Every test owns its fixture and teardown, so any
set of tests is runnable in any order; a `suite` is a named set with `tags:` for a Routine to select
by (`run --tag nightly`).

Artifacts a test creates carry the `QA:` prefix and the run id in their name, so `after` and the
next run's `given` can tell them from a user's objects. **Never delete anything the current run did
not create.** A name match is not evidence of ownership; abort and say what is in the way.

## The snapshot

`org.dxos.operation.debug.snapshot` (plugin-debug; `composer.snapshot()` in the console) is the
agent's eyes, taken after every step. One call returns:

- `layout` — mode, sidebars, `workspace`, and `active` (the graph paths of the open planks, which
  `appToolkit.open` and `switchWorkspace` accept).
- `planks` — each open plank with its resolved `label`, `subject` (`dxn`, `typename`, `name`, and
  `text` for a document), the graph `actions` the UI offers for it with their operation keys, and
  the `comments` threads anchored to its subject (id, anchor, status, messages).
- `spaces` — id, name, `SpaceState` name, and which is the default.
- `toasts` — what is on screen: title, description and button labels.
- `errors` — error-level log entries since `since` (a timestamp; default the last minute). Uncaught
  errors and unhandled rejections are forwarded into the log by the debug plugin, so a render crash
  shows up here too. Pass the run's start time and every snapshot reports the run's errors so far.
- `surfaces`, `attention`, `plugins`.

When a test needs something the snapshot does not report, extend
`packages/plugins/plugin-debug/src/operations/snapshot.ts` rather than scripting the page or
taking a screenshot.

## The page

The port lives in a page. Open it with the headless helper rather than a pane tab: a hidden tab
boots slowly or not at all, and a headless page mounts in seconds on a fresh profile.

```bash
node packages/apps/composer-app/testing/bin/qa-browser.mjs http://127.0.0.1:5182/ &
```

It prints `mounted` once the page has rendered and page errors as `[page] …`. In the cloud sandbox
set `PW_CHROMIUM_PATH=/opt/pw-browsers/chromium` (the image ships an older Chromium than
Playwright's pin); there the helper also passes the egress proxy flags, without which every HTTPS
request from the page is reset.

**`mounted` means the page is up, not the client.** The `dxos` hook is installed at the end of
`client.initialize()`, which on a cold profile finishes well after the mount — 51 s after it on
2026-09-09, because the shared-worker leader session times out once and is re-elected. An operation
invoked in that window has no client to reach, so poll a client-ready probe
(`typeof dxos !== 'undefined'` and a space in `SPACE_READY`) before the first step, as the
`composer-qa` skill §3 describes.

## Running remotely

Everything a run needs is in the repo, so a cloud session — a scheduled Routine or a one-off — can
run it without a display: the debug port is loopback (`127.0.0.1:9321`), which the sandbox's egress
proxy does not touch; `DX_DEBUG_PORT_SESSION` fixes the session id up front, so the agent never
reads it back from a sidecar or a log; and a headless page counts as visible, so boot is not gated.
The Routine prompt is [`agents/routines/composer-qa.md`](../../../../agents/routines/composer-qa.md).

## Reports

Each run writes `reports/<YYYY-MM-DD-HHMM>-<suite or plugin:QA-n>.md` from
[`reports/TEMPLATE.md`](reports/TEMPLATE.md): the branch and commit, start time, environment and
run id in the header, then one section per test with a row per step (stage, number, name, result,
observed value), the snapshot `errors` after each step, the `after` status, and findings. Reports
are gitignored so a local run leaves no diff; a Routine commits its report on the `qa` branch.

## Extending

1. Add a `test QA-n` to `APP.mdl` for a journey that crosses plugins, or to the plugin's
   `PLUGIN.mdl` for its own contract; add it to a suite, or give a new suite the tag a Routine runs.
2. Give the test its own `given`, `before` and `after`. Assume nothing from other tests.
3. One operation per step. `composer.operations()` on the port lists every operation the running app
   exposes with its input fields; prefer an operation the UI dispatches over one that exists only
   for agents, and judge the effect from `$snapshot` or a query, never from the return value.
4. Run it once through `/dxos:qa run` and fix the test where the app contradicted it before
   committing, then set its `status:` with the date. The spec is the artifact; the run is how it
   earns its accuracy.

## Two identities

Each `qa-browser.mjs` process is its own Chromium profile, so its own identity. `--session <uuid>`
re-keys that page's debug port, since the server bakes one session into every page it serves:

```bash
node packages/apps/composer-app/testing/bin/qa-browser.mjs http://127.0.0.1:5182/ --session <uuid> &
```

`bin/two-user-invite.mjs [url]` drives a full contact-book invitation between two fresh identities
(admit before contact, join, admit as contact) and prints Alice's inbox, contacts and envelope badge
at each step plus every EDGE `/inbox` call. A deployed origin serves the inbox only to identities bound
to a hub account (otherwise `403 identity_not_associated_with_account`); `--account` binds each fresh
identity with a `test+…@dxos.org` address against `DX_HUB_URL` (default the PR-preview hub,
`https://preview.dxos.network/hub/`):

```bash
node packages/apps/composer-app/testing/bin/two-user-invite.mjs https://pr-<n>-composer-dev.dxos.workers.dev/ --account
```

`--headed` opens the two browsers as visible windows side by side and leaves them open at the end,
with Alice's notifications panel showing. `--interactive` (with `--headed`) pauses before the second invite and then drives it
through Bob's Members panel on cue — Enter in that terminal, or creating `temp/two-user-start`. It covers
the invite half of `QA-12` in `spec/APP.mdl`.
