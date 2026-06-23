# Agent Harness Refactor — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: use `superpowers:executing-plans` (or
> `superpowers:subagent-driven-development`) to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking. Read the design spec
> [`harness-refactor.md`](./harness-refactor.md) first — it is the source of truth for *why*;
> this document is the *how*.

**Goal:** Consolidate the agent control plane into a single `HarnessService` reachable from
child processes via process RPC, externalize the alarm toolkit and the plan-completion reminder
as a blueprint + blueprint hook, and finish the supporting `Process.Params.annotations` and
`StorageService.Cell` refactors.

**Architecture:** Processes expose a typed `@effect/rpc` control surface (Step 1, already
landed). A conversation-scoped `HarnessService` serves pure conversation state directly (Tier A)
and forwards mutating calls (`setAlarm`, `enqueueMessage`) over RPC to the live `AgentProcess`
that hosts the conversation (Tier B). The host is discovered by a `HarnessHostAnnotation` on its
`Params.annotations`. Alarm scheduling and the plan reminder become operations/hooks that call
`HarnessService` instead of closing over process internals.

**Tech stack:** TypeScript, Effect-TS, `@effect/rpc@0.75.1`, DXOS `@dxos/compute` process
runtime, `LayerSpec`/`ServiceResolver` DI, ECHO `Annotation`, vitest.

---

## Orientation — key files

| Area | File |
| --- | --- |
| Process definition + `Params` + annotations | `packages/core/compute/compute/src/Process.ts` |
| Process runtime (spawn, list, handle) | `packages/core/compute/compute-runtime/src/ProcessManager.ts` |
| Process handle impl | `packages/core/compute/compute-runtime/src/ProcessHandle.ts` |
| Storage cells | `packages/core/compute/compute/src/StorageService.ts` |
| Blueprint schema + hooks | `packages/core/compute/compute/src/Blueprint.ts` |
| ECHO annotations API | `packages/core/echo/echo/src/Annotation.ts` |
| Harness service (stub) | `packages/core/compute/assistant/src/session/Harness.ts` |
| Deprecated services | `packages/core/compute/assistant/src/session/AiContext.ts`, `AiSession.ts` |
| Agent process (alarm/queue/guard) | `packages/core/compute/functions-runtime/src/agent-service/agent-process.ts` |
| Agent spawn site | `packages/core/compute/functions-runtime/src/agent-service/AgentService.ts:172` |
| Completion guard (to remove) | `packages/core/compute/functions-runtime/src/agent-service/completion-guard.ts` |
| Planning blueprint | `packages/core/compute/assistant-toolkit/src/blueprints/planning/` |

## Conventions (read before starting)

- **Build a package:** `moon run <project>:build` — projects used here: `compute`,
  `compute-runtime`, `assistant`, `assistant-toolkit`, `functions-runtime`.
- **Run one test file:** `moon run <project>:test -- src/Path.test.ts` (append `-t "name"` to
  filter). vitest transpiles without typechecking, so also run `:build` to catch type errors.
- **Lint:** `moon run :lint -- --fix`.
- **No casts** to silence types (`as any`, `as T`, `!`) — fix the type at its source. `as const`
  is fine. Audit with `git diff origin/main | grep -nE '\bas (any|unknown|[A-Z])|as unknown as'`.
- **Effect/DXOS skills** are available and authoritative: `effect`, `operations`, `blueprints`,
  `echo`, `testing-assistant-conversations`, `regenerate-memoized-llm`. Read the matching skill
  before writing that kind of code.
- **No compat shims.** When moving/deleting a service, update every call site in the same change.
- Commit after each task with a conventional-commit message (`feat(...)`, `refactor(...)`).

---

## Task 0: Stabilize the in-flight `Params`/`Handle` refactor (prerequisite)

`Process.Params` was already changed to `{ name, annotations }` (dropping `target`/`notify`),
but `ProcessManager.ts`/`ProcessHandle.ts` still reference `params.target`, `params.notify`,
`Handle<I, O>` (2 args), and `Handle.Any = Handle<any, any, never>`. The package does not
type-check. Finish it before adding features. Design: `target` and `notify` move onto
`Params.annotations` via annotations (`TargetAnnotation` already exists at `Process.ts:160`).

**Files:**
- Modify: `packages/core/compute/compute/src/Process.ts` (add `NotifyAnnotation`)
- Modify: `packages/core/compute/compute-runtime/src/ProcessManager.ts` (`SpawnOptions`,
  `ListOptions`, `matchesListOptions`, spawn params build ~`:437`, persistence reads ~`:594`,
  `:648`, `:935`, `list` filter ~`:844`, `Handle.Any` usages)
- Modify: `packages/core/compute/compute-runtime/src/ProcessHandle.ts` (`DormantHandle` add
  `rpc`; any `Handle<I, O>` → 3 args)
- Test: `packages/core/compute/compute-runtime/src/ProcessManager.test.ts`

- [ ] **Step 1: Add a `NotifyAnnotation` next to `TargetAnnotation`.**

```ts
// Process.ts, after TargetAnnotation
/** Notification descriptor for surfacing process events to the user. */
export const NotifyAnnotation = Annotation.make({
  id: 'org.dxos.process.notify',
  schema: NotifyOptions, // reuse the existing schema currently typed by Params['notify']
});
```

Find the current `notify` schema (it was `Process.Params['notify']`); if it was an inline type,
define a `NotifyOptions` `Schema.Struct` in `Process.ts` and use it here.

- [ ] **Step 2: Route `target`/`notify` through annotations at spawn.** In `ProcessManager.spawn`
  (`~:437`) build the dictionary from `SpawnOptions` and merge any caller-supplied `annotations`:

```ts
const annotations = Annotation.buildDictionary((dict) => {
  if (options?.target != null) Annotation.setDictionary(dict, Process.TargetAnnotation, options.target);
  if (options?.notify != null) Annotation.setDictionary(dict, Process.NotifyAnnotation, options.notify);
  if (options?.annotations) Object.assign(dict, options.annotations);
});
const params: Process.Params = { name: options?.name ?? null, annotations };
```

Add `readonly annotations?: Annotation.Dictionary;` to `SpawnOptions`. Keep `target`/`notify` on
`SpawnOptions` as ergonomic shorthands that fold into the dictionary above.

- [ ] **Step 3: Replace `params.target`/`params.notify` reads with annotation lookups.** At each
  persistence/list site (`:594`, `:648`, `:856`, `:935`, `matchesListOptions` `:199`), derive the
  value via `Annotation.getDictionary(params.annotations, Process.TargetAnnotation)` (returns
  `Option`). Persist `annotations` (already JSON-encodable) instead of separate `target`/`notify`
  columns; on hydrate, read them back from the persisted dictionary. The `list({ target })` filter
  compares the decoded `TargetAnnotation` value.

- [ ] **Step 4: Fix `Handle` arity.** Replace every `ProcessManager.Handle<I, O>` with
  `Handle<I, O, never>` (or the concrete RPC group where applicable). Change `Handle.Any` to
  `Handle<any, any, any>` (so the implemented `rpc: RpcClient<any>` is assignable — see spec §4.4).
  Add `readonly rpc: RpcClient.RpcClient<never>` (an empty client) to `DormantHandle`, built once
  via `RpcTest.makeClient(RpcGroup.make())` provided an empty scope, or a shared empty constant.

- [ ] **Step 5: Build clean + test.**

Run: `moon run compute-runtime:build && moon run compute-runtime:test -- src/ProcessManager.test.ts`
Expected: build succeeds (0 type errors), all tests pass.

- [ ] **Step 6: Commit.**

```bash
git add packages/core/compute/compute packages/core/compute/compute-runtime
git commit -m "refactor(compute): finish Params.annotations migration (target/notify → annotations)"
```

---

## Task 1: Annotations-based host discovery (spec Step 2)

**Files:**
- Modify: `packages/core/compute/compute/src/Process.ts`
- Modify: `packages/core/compute/compute-runtime/src/ProcessManager.ts` (`list`/`Handle` surface
  `params.annotations` — already true once Task 0 lands)
- Test: `packages/core/compute/compute-runtime/src/ProcessManager.test.ts`

- [ ] **Step 1: Write the failing test** in `ProcessManager.test.ts`:

```ts
describe('annotations', () => {
  it.effect(
    'surfaces spawn annotations on the handle and via list',
    Effect.fn(function* ({ expect }) {
      const manager = yield* ProcessManager.Service;
      const handle = yield* manager.spawn(Noop, {
        annotations: Annotation.buildDictionary((d) => {
          Annotation.setDictionary(d, Process.HarnessHostAnnotation, true);
        }),
      });
      expect(
        Option.getOrNull(Annotation.getDictionary(handle.params.annotations, Process.HarnessHostAnnotation)),
      ).toBe(true);
      const listed = yield* manager.list();
      expect(listed.some((p) => p.pid === handle.pid)).toBe(true);
    }, Effect.provide(TestLayer)),
  );
});
```

(Use any existing no-op process definition for `Noop`, e.g. the `Double`/void process already in
the test file.)

- [ ] **Step 2: Run to verify it fails** (`HarnessHostAnnotation` undefined).

Run: `moon run compute-runtime:test -- src/ProcessManager.test.ts -t "surfaces spawn annotations"`
Expected: FAIL — `Process.HarnessHostAnnotation` is not exported.

- [ ] **Step 3: Add the annotation** in `Process.ts` (after `TargetAnnotation`):

```ts
/** Marks a process as the harness host for its conversation (discovery substrate). */
export const HarnessHostAnnotation = Annotation.make({
  id: 'org.dxos.process.harnessHost',
  schema: Schema.Boolean,
});
```

- [ ] **Step 4: Run the test** — Expected: PASS. Then `moon run compute-runtime:build`.

- [ ] **Step 5: Commit.**

```bash
git add packages/core/compute/compute packages/core/compute/compute-runtime
git commit -m "feat(compute): add HarnessHostAnnotation for process discovery"
```

---

## Task 2: `AgentProcess` RPC control group (spec Step 3)

Give the agent process the `HarnessControl` RPC surface and stamp `HarnessHostAnnotation` at spawn.

**Files:**
- Modify: `packages/core/compute/functions-runtime/src/agent-service/agent-process.ts`
- Modify: `packages/core/compute/functions-runtime/src/agent-service/AgentService.ts:172`
- Test: `packages/core/compute/functions-runtime/src/agent-service/agent-process.test.ts`
  (create if absent; prefer extending an existing suite)

- [ ] **Step 1: Define the control group** at module scope in `agent-process.ts`:

```ts
import { RpcGroup, Rpc } from '@effect/rpc';
import { DateTime, Schema } from 'effect';
import { ContentBlock } from '@dxos/types';

const HarnessControl = RpcGroup.make(
  Rpc.make('setAlarm', {
    payload: Schema.Struct({ at: Schema.DateTimeUtc, message: Schema.NullOr(Schema.String) }),
    success: Schema.Void,
  }),
  Rpc.make('enqueueMessage', {
    payload: Schema.Struct({ content: Schema.Array(ContentBlock.Any) }),
    success: Schema.Void,
  }),
);
```

- [ ] **Step 2: Declare `rpcs` on the process** — add `rpcs: HarnessControl` to the
  `Process.make({ ... })` options object for the agent process.

- [ ] **Step 3: Provide handlers from `create()`** — return `rpcHandlers` alongside the existing
  `onInput`/`onAlarm`. Place this where `inputQueue` and `alarmManager` are in scope (after
  `:105`/`:119`):

```ts
rpcHandlers: yield* HarnessControl.toHandlersContext({
  setAlarm: Effect.fn(function* ({ at, message }) {
    yield* alarmManager.setWakeAt(DateTime.toEpochMillis(at), message);
  }),
  enqueueMessage: Effect.fn(function* ({ content }) {
    inputQueue.push({ _tag: 'prompt', content });
    yield* AgentEventsKey.set(inputQueue);
    yield* alarmManager.reconcile(true);
  }),
}),
```

Note: this requires the alarm to persist a `message` (Task 3) and the `prompt` event variant to
accept `ContentBlock[]` (spec §12.3) — see Step 5 below.

- [ ] **Step 4: Stamp the host annotation at spawn** in `AgentService.ts:172`:

```ts
handle = yield* processManager.spawn(executable, {
  name: 'Agent',
  target,
  annotations: Annotation.buildDictionary((d) => {
    Annotation.setDictionary(d, Process.HarnessHostAnnotation, true);
  }),
  environment: { ...(spaceId !== undefined ? { space: spaceId } : {}), conversation: target },
  traceMeta: { conversationId: feed.id },
});
```

- [ ] **Step 5: Widen the `prompt` event + alarm message.** In the `AgentEvent` union, change the
  `prompt` variant payload from `string` to `Schema.Array(ContentBlock.Any)` (or add a content
  field), and update `wakeUpPrompt`/the self-wake path (`:243`) to carry the stored message. Make
  `AlarmManager` persist `{ wakeAt, message }` — update `AgentAlarmKey` (`:584`) schema to
  `Schema.parseJson(Schema.NullOr(Schema.Struct({ wakeAt: Schema.Number, message: Schema.NullOr(Schema.String) })))`
  and thread `message` through `setWakeAt`/`#wakeAt`.

- [ ] **Step 6: Write a test** that spawns the agent process and drives the RPC:

```ts
const handle = yield* manager.spawn(agentProcess /* AgentService executable */, { /* target */ });
yield* handle.rpc.setAlarm({ at: DateTime.unsafeNow(), message: 'wake' });
// assert the process hibernates with a pending alarm / fires via TestClock
```

Use `TestClock` (see `testing-assistant-conversations` skill); avoid sleeps.

- [ ] **Step 7: Build + test.**

Run: `moon run functions-runtime:build && moon run functions-runtime:test -- src/agent-service/agent-process.test.ts`
Expected: PASS.

- [ ] **Step 8: Commit.**

```bash
git add packages/core/compute/functions-runtime
git commit -m "feat(functions-runtime): expose AgentProcess HarnessControl RPC + host annotation"
```

---

## Task 3: `HarnessService` implementation + call-site migration (spec Step 4)

Implement the `HarnessService` contract in `Harness.ts` as a `LayerSpec`, merging Tier A logic
from the current `AiContext.Service` and wiring Tier B over RPC. Then delete the two deprecated
services and migrate all call sites.

**Files:**
- Modify: `packages/core/compute/assistant/src/session/Harness.ts`
- Read for Tier A pattern: `packages/core/compute/assistant/src/session/AiContext.ts`
- Modify: `packages/core/compute/assistant/src/session/AiSession.ts` (provide `HarnessService`
  in `createRequest`; remove `AiContext.Service`/`AiSession.Service`)
- Delete: the `AiContext.Service` and `AiSession.Service` tags (keep `Binder` in `AiContext.ts`)
- Migrate call sites (run the grep below) — full list in spec §6.2.
- Test: `packages/core/compute/assistant/src/session/*.test.ts` and
  `packages/core/compute/functions-runtime/src/testing/assistant-test-layer.ts`

Find all call sites:

```bash
rg -l "AiContext\.Service|AiSession\.Service" packages | rg -v "docs/|AUDIT"
```

- [ ] **Step 1: Implement Tier A.** Replace the `todo()` bodies in `Harness.ts`. Build the service
  from a `LayerSpec` with conversation affinity, requiring `Database.Service` + `ProcessManager.Service`.
  Copy the feed-resolution / `Binder` / history logic from `AiContext.ts`'s existing `LayerSpec`:

```ts
binder: /* resolve feed from context.conversation, build Binder (from AiContext) */,
history: /* read messages from the resolved feed */,
```

- [ ] **Step 2: Implement Tier B over RPC.** Look up the host lazily per call and dispatch:

```ts
const owningHost = Effect.gen(function* () {
  const pm = yield* ProcessManager.Service;
  const procs = yield* pm.list({ target: context.conversation });
  const host = procs.find(
    (p) =>
      !isTerminalProcess(p.status.state) &&
      Option.getOrElse(
        Annotation.getDictionary(p.params.annotations, Process.HarnessHostAnnotation),
        () => false,
      ),
  );
  return host ?? (yield* new NotSupportedError());
});

const setAlarm = ({ at, message }: SetAlarmOptions) =>
  owningHost.pipe(Effect.flatMap((host) => host.rpc.setAlarm({ at, message })));

const enqueueMessage = ({ content }: EnqueueMessageOptions) =>
  owningHost.pipe(Effect.flatMap((host) => host.rpc.enqueueMessage({ content })));
```

`host.rpc` is typed `RpcClient<never>` on `Handle.Any`; narrow by typing the discovered host as
the agent's `Handle<string, void, typeof HarnessControl.Rpcs>`, or re-declare the control group in
a shared location both `agent-process.ts` and `Harness.ts` import (preferred — create
`packages/core/compute/assistant/src/session/harness-control.ts` exporting `HarnessControl`).

- [ ] **Step 3: Provide `HarnessService` from the request loop.** In `AiSession.ts`
  `createRequest`, provide `HarnessService` into the request context where it currently provides
  `AiContext.Service` (+ `AiSession.Service`).

- [ ] **Step 4: Migrate every call site** from the grep in Step 0 to `HarnessService`
  (`bindContext`/`findObjects`/`{ binder }` → `HarnessService.binder`/`queryContext`). Update the
  test layer `assistant-test-layer.ts` and `plugin-doctor`.

- [ ] **Step 5: Delete the deprecated tags.** Remove `AiContext.Service` and `AiSession.Service`
  class definitions (no shims). Keep `AiContext.Binder`.

- [ ] **Step 6: Build + test the dependent packages.**

Run: `moon run assistant:build && moon run assistant-toolkit:build && moon run functions-runtime:build`
then `moon run assistant:test`. Expected: PASS. Some assistant tests use memoized LLM fixtures —
if they fail with "No memoized conversation found", follow the `regenerate-memoized-llm` skill.

- [ ] **Step 7: Commit.**

```bash
git add packages
git commit -m "refactor(assistant): replace AiContext/AiSession services with HarnessService"
```

---

## Task 4: Externalize the alarm toolkit as a blueprint (spec Step 5)

Replace `makeAlarmToolkit` (`agent-process.ts:771`) with operations that call `HarnessService`,
bound as a blueprint. Read the `operations` and `blueprints` skills first.

**Files:**
- Create: `packages/core/compute/assistant-toolkit/src/blueprints/alarm/operations/set-alarm.ts`
- Create: `packages/core/compute/assistant-toolkit/src/blueprints/alarm/operations/get-current-date.ts`
- Create: `packages/core/compute/assistant-toolkit/src/blueprints/alarm/operations/definitions.ts`
- Create: `packages/core/compute/assistant-toolkit/src/blueprints/alarm/blueprint.ts`
- Create: `packages/core/compute/assistant-toolkit/src/blueprints/alarm/blueprint.test.ts`
- Modify: `agent-process.ts` (stop passing `alarmToolkit` to `createRequest`; remove
  `makeAlarmToolkit`/`AlarmToolkit`; move `resolveWakeAt` into the operation)

- [ ] **Step 1: Write the blueprint test first** (extend an existing blueprint suite pattern; see
  `assistant-toolkit/src/blueprints/planning/blueprint.test.ts` for the shape):

```ts
test('agent schedules a self-wake via the alarm blueprint', ({ expect }) =>
  Effect.gen(function* () {
    // bind alarm blueprint, drive a turn that calls set-alarm, advance TestClock, assert wake
  }).pipe(Effect.provide(AssistantTestLayer({ /* ... */ })), runTest));
```

- [ ] **Step 2: Implement `set-alarm` operation** — parse `{ in, at }` (move `resolveWakeAt`
  here), convert to `DateTime`, then `yield* HarnessService.setAlarm({ at, message })`. Implement
  `get-current-date` reading `Effect.clock`. Wire both into `definitions.ts` via
  `OperationHandlerSet` (see `operations` skill).

- [ ] **Step 3: Define the blueprint** in `blueprint.ts` referencing the two operations as tools
  (mirror an existing `blueprints/*/blueprint.ts`).

- [ ] **Step 4: Remove the inline toolkit** — delete `AlarmToolkit`/`makeAlarmToolkit`, drop the
  `alarmToolkit` argument from the `createRequest` call (`agent-process.ts:201`/`:258`). Bind the
  alarm blueprint to the conversation wherever default blueprints are bound.

- [ ] **Step 5: Build + test.**

Run: `moon run assistant-toolkit:build && moon run assistant-toolkit:test -- src/blueprints/alarm/blueprint.test.ts`
then `moon run functions-runtime:build`. Expected: PASS.

- [ ] **Step 6: Commit.**

```bash
git add packages/core/compute/assistant-toolkit packages/core/compute/functions-runtime
git commit -m "feat(assistant-toolkit): externalize alarm toolkit as a blueprint via HarnessService"
```

---

## Task 5: Blueprint hook engine + planning reminder hook (spec Step 6)

Execute `Blueprint.hooks` and move the `CompletionGuard` into an `end-request` hook.

**Files:**
- Modify: where requests run — `AiSession.ts` (`begin-request`) and `agent-process.ts`
  (`end-request`, around the `maybeComplete`/end-of-turn point)
- Create: planning hook operation under
  `packages/core/compute/assistant-toolkit/src/blueprints/planning/operations/plan-reminder.ts`
- Modify: planning `blueprint.ts` to declare the `end-request` hook (`spec: { _tag: 'end-request' }`,
  `function: Ref → plan-reminder operation`)
- Delete: `packages/core/compute/functions-runtime/src/agent-service/completion-guard.ts` and its
  uses (`agent-process.ts:36,69,129,139-144`, `AgentService.ts:116`, the `AgentCompletionGuard`
  capability, and the `completion_check`/`plan_continue_reminder` events)
- Test: extend planning `blueprint.test.ts`

- [ ] **Step 1: Implement the hook engine.** At request begin (resolve bound blueprints, run each
  hook whose `spec._tag === 'begin-request'`) and request end (same for `'end-request'`). For each
  hook: resolve `hook.function` ref to its operation, template `hook.input`, invoke via the
  operation invoker. Keep it small; firing points per spec §8.1.

- [ ] **Step 2: Write the failing test** — an agent with an incomplete plan gets a continuation
  reminder and continues; a clean plan completes. (Memoized LLM — see `regenerate-memoized-llm`.)

- [ ] **Step 3: Implement the planning hook operation** — read the plan; if incomplete tasks
  exist, `yield* HarnessService.enqueueMessage({ content: [reminder] })` (same effect as today's
  `plan_continue_reminder`). Decide the ephemeral stop/continue check per spec §12.4 (keep inside
  the hook fn or drop).

- [ ] **Step 4: Declare the hook** on the planning blueprint and remove `CompletionGuard` end to
  end (file, capability, events, `getIncompletePlanSummary` calls).

- [ ] **Step 5: Build + test.**

Run: `moon run compute:build && moon run assistant-toolkit:test -- src/blueprints/planning/blueprint.test.ts`
then `moon run functions-runtime:build`. Expected: PASS.

- [ ] **Step 6: Commit.**

```bash
git add packages
git commit -m "feat(compute): execute blueprint hooks; move plan reminder to planning end-request hook"
```

---

## Task 6: `StorageService.Key` → `Cell` rename (spec Step 7)

Mechanical rename of the typed-key abstraction.

**Files:**
- Modify: `packages/core/compute/compute/src/StorageService.ts` (`Key`→`Cell`,
  `KeyWithDefault`→`CellWithDefault`, `key()`→`cell()`; keep `withDefault`)
- Modify all usages: `AgentEventsKey`, `DelegationsKey`, `ToolCallStateKey`, `AgentAlarmKey`,
  `OperationStartedKey` (rename the call `StorageService.key(...)` → `StorageService.cell(...)`;
  the variable names may stay or be renamed `*Cell` for consistency)

- [ ] **Step 1: Rename in `StorageService.ts`** — `Key`→`Cell`, `KeyWithDefault`→`CellWithDefault`,
  `export const key`→`export const cell`. Update the JSDoc.

- [ ] **Step 2: Update call sites.**

```bash
rg -l "StorageService\.key\(|StorageService\.Key|KeyWithDefault" packages
```

Replace each. (The `set/get/delete/list/clear` free functions and `withDefault` are unchanged.)

- [ ] **Step 3: Build affected packages + test.**

Run: `moon run compute:build && moon run functions-runtime:build && moon run functions-runtime:test`
Expected: PASS.

- [ ] **Step 4: Commit.**

```bash
git add packages
git commit -m "refactor(compute): rename StorageService.Key → Cell"
```

---

## Task 7: Composer planning skill fix (spec Step 8)

**Files:**
- Investigate: `packages/core/compute/assistant-toolkit/src/skills/planning/` vs
  `.../src/blueprints/planning/` (spec §10 — two parallel trees exist)

- [ ] **Step 1: Determine the live copy.** Find which planning tree composer actually loads (grep
  the plugin wiring in `packages/plugins/plugin-assistant/` for the planning blueprint/skill key).
  Document the finding in the commit message.

- [ ] **Step 2: Apply the fix** to the active copy only (the original report that motivated "fix
  Agent planning skill in composer"). If the inactive tree is dead, note it for a separate cleanup
  — do not fix both.

- [ ] **Step 3: Build + test.**

Run: `moon run assistant-toolkit:build && moon run assistant-toolkit:test`
Expected: PASS.

- [ ] **Step 4: Commit.**

```bash
git add packages
git commit -m "fix(assistant-toolkit): correct composer planning skill"
```

---

## Final verification

- [ ] `moon run compute:build && moon run compute-runtime:build && moon run assistant:build && moon run assistant-toolkit:build && moon run functions-runtime:build` — all green.
- [ ] `MOON_CONCURRENCY=4 moon run :test -- --no-file-parallelism` for the affected packages — green.
- [ ] `moon run :lint -- --fix` — clean.
- [ ] Cast audit: `git diff origin/main | grep -nE '\bas (any|unknown|[A-Z])|as unknown as'` — every hit justified or removed.
- [ ] Spec coverage check: each of spec §5–§9 maps to a task above (Task 1→§5, Task 2→§6.1+§5 stamp, Task 3→§6, Task 4→§7, Task 5→§8, Task 6→§9, Task 7→§10).

## Notes / decisions to confirm with the maintainer

- **`notify`/`target` → annotations (Task 0):** prescribed here because `TargetAnnotation` already
  exists. If the maintainer instead wants `notify` to remain a first-class `Params` field, re-add
  it to `Params` and skip `NotifyAnnotation`.
- **Shared `HarnessControl` group (Task 3 Step 2):** put the `RpcGroup` in one module imported by
  both `agent-process.ts` and `Harness.ts` so the Tier-B client is fully typed (no `RpcClient<any>`
  at the call site).
- **Tier-B accounting (spec §12.5):** current RPC dispatch does not bump `#activeHandlers`; safe
  only because Tier-B calls happen within an active turn. Revisit if a detached caller is added.
