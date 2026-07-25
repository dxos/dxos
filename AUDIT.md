# Storybook testbench audit (PR #12336)

Investigation of the issues reported against the `story-modules` → `storybook-testing` refactor:
hanging stories, slow startup, and EDGE first-connection rejection. Status of each below.

---

## 1. Slow startup on working stories — REGRESSION, fixed

**Symptom.** Every assistant/brain/inbox story became slow to start; the console shows
`ManagerImpl … event activation is taking a long time`.

**Root cause.** Relocating the generic diagnostics (`Logging`, `Invocations`, `ExecutionGraph`)
into `@dxos/storybook-testing` and re-exporting them from the **main barrel**
(`export * from './modules'`) meant that importing the core (`Cell`, `ModuleContainer`,
`StoryLayout`) eagerly pulled the whole diagnostic module graph — and its heavy deps
(`@dxos/devtools`, `@dxos/compute-runtime`, `@dxos/react-ui-components`, `@dxos/react-ui-debug`) —
into **every** story in **all three** story packages (including brain/inbox, which never use them).
Vite dev must serve that entire graph before a story starts.

**Fix (this branch).** Moved the diagnostics behind a dedicated
`@dxos/storybook-testing/modules` subpath export; the main barrel now exposes only `Cell`,
`ModuleContainer`, and `StoryLayout`. Only `stories-assistant/testing/modules.tsx` (which registers
those surfaces) and `ChatModule` import from the subpath. Core imports are thin again, and
brain/inbox no longer load devtools/compute-runtime at all.

**Verification.** All four packages build clean. The user's running storybook (`:9009`) must be
**restarted** to pick up the `exports` change (a package.json `exports` edit is not hot-reloaded).

---

## 2. Hanging stories (e.g. `Documents/WithMarkdown`) — partially addressed; re-measure needed

**Symptom.** The story appears to hang; the iframe sits on "No Preview"/blank while the console logs
`onClientInitialized` then `event activation is taking a long time` (no thrown error).

**Findings.**

- No crash — it is slow activation, not a render error.
- The slowness is dominated by the eager heavy-dep load in §1 (every `config.remote` story also
  waits on EDGE — see §3 — which compounds the perceived hang).
- The surface-grid container gates only on the **local** space (`useSpaces()`), not on EDGE, so the
  layout itself does not require EDGE to render.

**Action.** §1's fix removes the biggest startup cost. After restarting `:9009`, re-open
`WithMarkdown`; if activation is still slow, the next step is per-plugin activation timing via the
`@dxos/log`-based debug instrumentation (the `debug-mode` workflow), focused on which
`SetupReactSurface`/`ProcessManagerReady` handler dominates.

---

## 3. EDGE first connection rejected then recovers — EXPECTED, not caused by this PR

**Symptom.** `edge-client.ts:348 GET http://localhost:8787/ws/did:halo:… net::ERR_CONNECTION_REFUSED`
on the first attempt for each `config.remote` story, which then connects.

**Explanation.** `config.remote` (`SERVICES_CONFIG.REMOTE`) points the client at a local EDGE worker
on `localhost:8787`. `EdgeClient` maintains the socket via `PersistentLifecycle`
(`packages/core/mesh/edge-client/src/edge-client.ts:84`). Connection start first does an auth
`fetch` to derive the WS presentation header (`_createAuthHeader`, ~line 345). If EDGE is cold or not
yet listening, that `fetch` is refused and the start **throws** — which is intentional: throwing lets
`PersistentLifecycle` apply its **backoff** and retry (see the comment at edge-client.ts:295–296:
returning instead would reset backoff into a hot reconnect loop). Once EDGE accepts, the auth
challenge (`401`) completes and the socket opens. So the single refused request per story is the
first backoff attempt, and recovery is the lifecycle's retry — normal behavior, independent of this
refactor.

**Note.** If a local EDGE is **not** running on `:8787`, `config.remote` stories will retry
indefinitely and their AI/chat features never come online (repeated `Edge connection closed`
warnings). That is an environment prerequisite, not a code defect. Stories that only need the local
space still render; only live-AI behavior depends on EDGE.

---

## 4. Pre-existing, unrelated test failures (out of scope)

`stories-inbox` `CreateTopic` / `CreateProject` fail under `test-storybook` with
`Edge connection closed`. These are standalone live-operation stories (no `Module`/`Cell`/
`ModuleProps` involvement) that invoke an operation requiring EDGE + AI; they fail on `main` for the
same reason when no EDGE is reachable. Not caused by this PR.

---

## 5. Follow-ups

- Restart `:9009` and re-measure §1/§2.
- If activation is still slow after §1, profile plugin activation with debug logging.
- (Author) `storybook-testing/src/test/startup.test.ts` swallows `RpcClosedError` via
  `process.on('uncaughtException'/'unhandledRejection')` — replace with a narrowly-scoped vitest
  `onUnhandledError` per the repo's no-blanket-suppression rule (flagged in the PR review reply).
