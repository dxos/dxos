# Agent Harness Refactor — Design Spec

Status: implemented (Steps 1–8 landed).

Progress:

- [x] **Step 1 — generic process RPC control plane** (`@dxos/compute` + `@dxos/compute-runtime`).
      Landed: `Process.make({ rpcs })`, `Callbacks.rpcHandlers`, `Handle.rpc`, in-memory
      dispatch via `@effect/rpc` `RpcTest.makeClient`. See §4 for the as-built notes.
- [x] Step 2 — annotations-based discovery (`HarnessHostAnnotation`, surface `params.annotations`).
- [x] Step 3 — `AgentProcess` `HarnessControl` group + handlers; stamp host annotation at spawn.
- [x] Step 4 — `HarnessService` LayerSpec (Tier A + B); migrate call sites; delete deprecated services.
- [x] Step 5 — alarm blueprint externalization; remove inline `AlarmToolkit`; persist alarm `message`.
- [x] Step 6 — blueprint hook execution engine; planning `end-request` hook; remove `CompletionGuard`.
      The ephemeral stop/continue LLM check (§12.4) was dropped — the end-request hook enqueues
      a continuation reminder when incomplete tasks remain, which keeps the process alive.
- [x] Step 7 — `StorageService.Key → Cell` rename.
- [x] Step 8 — Composer planning skill fix (single live `src/skills/planning/` tree; removed an
      `as any` in `update-tasks.ts` in favour of `Operation.opaqueHandler`).

## 1. Motivation

The agent runtime currently spreads its "control plane" across several ad-hoc
mechanisms:

- `AiContext.Service` and `AiSession.Service` are two overlapping conversation-scoped
  services (both already `@deprecated → Harness`).
- The agent's alarm/queue control lives inside the `AgentProcess` closure
  (`AlarmManager`, `inputQueue`), reachable only by code running in the agent fiber.
- The `AlarmToolkit` is an inline `OpaqueToolkit` passed directly into
  `session.createRequest`, bypassing the operation/blueprint machinery so it can close
  over `AlarmManager`.
- Blueprint `hooks` (`begin-request` / `end-request`) are defined in schema but executed
  nowhere; the "unfinished plan tasks" reminder is instead hardwired into the process via
  a `CompletionGuard`.

Goal: consolidate this into a single `HarnessService` with a clear separation of
concerns, make alarm/enqueue reachable from operations running in child processes, and
turn the plan reminder into a real blueprint hook.

## 2. Core invariant — four planes

Each communication path with a process has one job. Keeping them separate is the
organizing principle of this refactor.

| Plane           | Mechanism                           | Semantics                                  |
| --------------- | ----------------------------------- | ------------------------------------------ |
| Work queue      | `Handle.submitInput` / input events | Durable, ordered, replayed on hydrate      |
| Control plane   | Process RPC (`@effect/rpc`)         | Transient, request/response, live-only     |
| Durable state   | `StorageService`                    | Per-process persisted key/value            |
| Identity / role | `Process.Params.annotations`        | Set once at spawn, immutable, discoverable |

Consequences:

- The input stream is for **work items only**; control messages (set-alarm, enqueue) do
  NOT go through it.
- Anything that must change at runtime lives on the RPC or Storage plane, never on
  annotations.
- Discovery of a process ("who hosts the harness for conversation X?") is an annotation
  lookup, decoupled from concrete process keys.

## 3. Background — execution locality (the root problem)

Operations (e.g. `set-alarm`, a future `tasks-check`) execute as **child processes** via
`operationInvoker.invokeFiber`. A child process:

- CAN derive conversation-scoped state from `context.conversation` (resolve the feed, build
  a `Binder`, read history) — this is why `AiContext.Service` resolves fine in children.
- CANNOT touch the parent `AgentProcess`'s in-memory `AlarmManager` / `inputQueue`, and its
  own `StorageService` is a separate per-process namespace.

So Harness methods split by reachability:

- **Tier A** (`binder`, `history`, `queryContext`) — pure functions of `conversation`.
  Served entirely inside the `LayerSpec`. Available in any conversation-scoped context.
- **Tier B** (`setAlarm`, `enqueueMessage`) — mutate live `AgentProcess` state. Require a
  channel to the owning process. Return `NotSupportedError` when no live owner exists.

Liveness is guaranteed by construction: a Tier-B-using operation is spawned _during the
agent's turn_, which runs inside the live agent process. The owner is therefore always live
when Tier B is invoked; `NotSupportedError` is a resolution-time concern (no agent owns this
conversation — stories, standalone sessions), not a runtime race.

## 4. Process RPC control plane (generic, in `@dxos/compute` + `@dxos/compute-runtime`) — IMPLEMENTED

A typed control surface on processes, built on `@effect/rpc` (`@effect/rpc@0.75.1`). This
section documents the as-built design (Step 1).

### 4.1 Definition surface

A process optionally declares an `rpcs` group; `create()` must then return matching
`rpcHandlers`. Both are typed by a fourth `Process` type parameter `_Rpcs extends Rpc.Any`
(phantom-covariant so `never`-RPC processes remain assignable — see §4.4).

```ts
// Process.ts
Process.make(
  {
    key: 'test.process-with-rpcs',
    input: Schema.Void,
    output: Schema.Void,
    services: [],
    rpcs, // RpcGroup.RpcGroup<_Rpcs> (optional; defaults to an empty group)
  },
  (ctx) =>
    Effect.gen(function* () {
      const storage = yield* StorageService.StorageService;
      return {
        // Built with rpcs.toHandlersContext: captures create()'s service context, so
        // handlers run against the same StorageService / closed-over state as the
        // lifecycle callbacks.
        rpcHandlers: yield* rpcs.toHandlersContext({
          getValue: Effect.fn(function* () {
            /* read storage */
          }),
          setValue: Effect.fn(function* ({ value }) {
            /* write storage */
          }),
        }),
      };
    }),
);
```

`Callbacks.rpcHandlers: Context.Context<Rpc.ToHandler<_Rpcs>>`. `Process.make` validates the
handler contract at construction via `sanitizeRpcs`: handlers are required iff a non-empty
`rpcs` group is declared (and rejected/empty otherwise).

### 4.2 Handle surface

```ts
// ProcessManager.Handle<I, O, _Rpcs>
readonly rpc: RpcClient.RpcClient<_Rpcs>; // typed client over the definition's rpc group
```

Callers invoke RPCs as `handle.rpc.<tag>(payload)` returning `Effect<Success, Error>`
(see the `rpcs` test in `ProcessManager.test.ts`). For a future worker boundary, a
remote/proxy handle implements the same `rpc` client over a serialized transport; same
interface.

### 4.3 Runtime semantics — in-memory loopback (as built)

Rather than hand-rolling a `#runRpc` that reuses `#runHandler`, the handle wires a
**no-serialization `@effect/rpc` client/server pair** via `RpcTest.makeClient(definition.rpcs)`,
provided with `callbacks.rpcHandlers` and the **process scope**. The resulting client is stored
as `Handle.rpc`. This is done at both construction sites (`spawn` and rehydrate) in
`ProcessManager`.

Consequences of this choice (and how the original `#runHandler` concerns are addressed):

- **Service access / durable side effects.** `toHandlersContext` captures `create()`'s context,
  so handlers resolve `StorageService` and close over `AlarmManager`/`inputQueue`. A Tier-B
  handler persists its own durable effect inline (e.g. `AgentAlarmKey.set(...)`), so no
  post-settle `persistence` hook is needed.
- **Lifecycle accounting.** RPC calls are **not** integrated into `#activeHandlers`. This is
  acceptable because Tier-B RPCs are issued **synchronously within an active turn** (the calling
  operation runs inside the live agent process while `onInput`/`onAlarm` is in flight), so the
  process cannot reach `IDLE` mid-call. The durable effect is captured by the handler itself, not
  by turn-settle bookkeeping.
- **Failure isolation (free).** `@effect/rpc` returns typed handler errors to the caller over the
  loopback; a handler error does not route into `#failImmediately`, so the process survives. Only
  defects/interruptions on the server fiber propagate as process failure.
- **Liveness.** The client/server fibers are bound to the process scope, so the control surface is
  torn down with the process — consistent with "control plane is live-only".
- **Not durable.** RPCs are never appended to the mailbox (`appendEvent`); they are transient.

### 4.4 Type-system note (`_Rpcs` variance)

`Process`/`Handle`/`Callbacks` carry `_Rpcs extends Rpc.Any`. Because `RpcGroup`/`RpcClient` are
invariant in their type argument, the runtime stores the group/handlers/client as `any` internally
(`Handle.rpc: RpcClient.RpcClient<any>`, `#callbacks: Callbacks<I, O, R, any>`) while the public
`Handle<I, O, _Rpcs>` surface stays precise. This keeps `never`-RPC processes (the common case)
assignable to `Process.Any`/`Handle.Any` without casts at call sites.

## 5. Process annotations for discovery

`Process.Params.annotations: Annotation.Dictionary` (typed, schema-backed, set once at spawn,
immutable) is the discovery substrate. Define a neutral marker in `@dxos/compute` next to the
existing `TargetAnnotation` so the lower layer never imports an agent-specific process key:

```ts
// Process.ts
export const HarnessHostAnnotation = Annotation.make({
  id: 'org.dxos.process.harnessHost',
  schema: Schema.Boolean,
});
```

`AgentProcess` stamps it at spawn (alongside `target`):

```ts
yield *
  processManager.spawn(executable, {
    name: 'Agent',
    target,
    annotations: Annotation.buildDictionary((d) => {
      Annotation.setDictionary(d, Process.HarnessHostAnnotation, true);
    }),
  });
```

`ProcessManager.list`/`Handle` must surface `params.annotations` (it already exposes `params`;
`Params` now carries `annotations`).

This same mechanism later enables generic input-queue-management tooling: enumerate processes
by role annotation and inspect/replay their queues without hardcoding process keys.

## 6. HarnessService (replaces AiContext.Service + AiSession.Service)

Single conversation-scoped service. The contract (already drafted in
`assistant/src/session/Harness.ts`):

```ts
export interface Service {
  binder: Effect.Effect<Binder, NotSupportedError>;
  history: Effect.Effect<Message.Message[], NotSupportedError>;
  enqueueMessage(options: EnqueueMessageOptions): Effect.Effect<void, NotSupportedError>;
  setAlarm(options: SetAlarmOptions): Effect.Effect<void, NotSupportedError>;
}
```

Provided by a single `LayerSpec`, process affinity, requiring `Database.Service` and
`ProcessManager.Service`:

- **Tier A** (`binder`, `history`, `queryContext`): resolve the feed from
  `context.conversation`, build a `Binder` / read history. (This is the existing
  `AiContext.Service` LayerSpec logic, merged in.)
- **Tier B** (`setAlarm`, `enqueueMessage`): look up the owning host process **lazily per
  call** (so a model-switch process replacement isn't captured stale), then dispatch over its
  `Handle.rpc` control surface (§4):

```ts
const owningHost = Effect.gen(function* () {
  const procs = yield* pm.list({ target: context.conversation });
  const host = procs.find(
    (p) =>
      !isTerminal(p.status.state) &&
      Option.getOrElse(Annotation.getDictionary(p.params.annotations, Process.HarnessHostAnnotation), () => false),
  );
  return host ?? (yield* Effect.fail(new NotSupportedError()));
});

// HarnessService.setAlarm:
const host = yield * owningHost;
yield * host.rpc.setAlarm({ at, message });
```

The `host.rpc.setAlarm(...)` call runs the handler on the host's server fiber (§4.3), inside
the live `AgentProcess` scope, with that process's `AlarmManager`/`inputQueue` in scope. The
`NotSupportedError` is raised at discovery time when no live host owns the conversation.

### 6.1 AgentProcess control group

Defined and implemented by `AgentProcess` (it owns the state):

```ts
// AgentProcess module scope — the group passed to Process.make({ rpcs: HarnessControl }).
const HarnessControl = RpcGroup.make(
  Rpc.make('setAlarm', {
    payload: { at: Schema.DateTimeUtc, message: Schema.NullOr(Schema.String) },
    success: Schema.Void,
  }),
  Rpc.make('enqueueMessage', {
    payload: { content: Schema.Array(ContentBlock.Any) },
    success: Schema.Void,
  }),
);

// in AgentProcess create(), alongside onInput/onAlarm — same `toHandlersContext` pattern
// the generic RPC surface expects (§4.1). Handlers close over the live alarmManager/inputQueue
// and persist their own durable effect inline.
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

### 6.2 Call-site migration

Existing `AiContext.Service` consumers (~15 sites: `bindContext`, `findObjects`,
`{ binder }` destructuring) and `AiSession.Service` consumers (test layer, `plugin-doctor`)
migrate to `HarnessService`. Both deprecated services are removed (no compat shims, per repo
policy). `AiSession.Session.createRequest` provides `HarnessService` into the request context
instead of `AiContext.Service` + `AiSession.Service`.

## 7. AlarmToolkit → alarm blueprint

Replace the inline `makeAlarmToolkit(alarmManager)` with a blueprint whose tools are
operations:

- `set-alarm` operation: parse `in`/`at` (move `resolveWakeAt` here), then
  `Harness.setAlarm({ at, message })`.
- `get-current-date` operation: read the clock.

The operations run as child processes and reach the agent via `HarnessService` Tier B (RPC).
`AgentProcess` stops passing `alarmToolkit` to `createRequest`; the alarm blueprint is bound
to the conversation like any other blueprint.

Feature delta: `AlarmManager` must persist a `message` alongside `wakeAt`, and the self-wake
input event carries it (instead of the fixed `wakeUpPrompt`).

## 8. Plan reminder → blueprint hook

### 8.1 Hook execution engine (prerequisite, currently missing)

Implement execution of `Blueprint.hooks` for `begin-request` / `end-request`. Natural firing
points: around `AiRequest.begin` (begin) and at the `maybeComplete` / end-of-turn point in
`AgentProcess` (end). A hook resolves its `function` ref and invokes it with the templated
`input`.

### 8.2 Planning blueprint hook

Move the `CompletionGuard` logic into an `end-request` hook on the planning blueprint:

- read the agent's plan; if it has incomplete tasks, `Harness.enqueueMessage` a continuation
  reminder (keeps the process alive — same effect as today's `plan_continue_reminder`).
- the ephemeral stop/continue LLM check (`planCompletionCheck`) either moves inside the hook
  function or is dropped (decision below).

Remove `CompletionGuard`, `makePlanCompletionGuard`, the `AgentCompletionGuard` capability,
and the `completion_check` / `plan_continue_reminder` input events once the hook covers it.

## 9. StorageService.Key → Cell rename

Rename the typed-key abstraction `StorageService.Key` / `KeyWithDefault` and the `key()` /
`withDefault()` factories to `Cell` / `cell()` (there is no symbol literally named
`StorageKey`; the rename targets this abstraction). Update usages: `AgentEventsKey`,
`DelegationsKey`, `ToolCallStateKey`, `AgentAlarmKey`, `OperationStartedKey`. Mechanical.

## 10. Composer planning skill fix

Note: there are parallel `assistant-toolkit/src/skills/*` and `assistant-toolkit/src/blueprints/*`
trees (both contain `planning/`, `agent/`, etc.). Confirm which one is live in composer before
editing so the fix lands on the active copy.

## 11. Sequencing

1. ~~Generic process RPC surface: `Process.make({ rpcs })`, `Callbacks.rpcHandlers`,
   `Handle.rpc`, in-memory dispatch (via `@effect/rpc` `RpcTest.makeClient`, with failure
   isolation).~~ **Done** (§4).
2. Annotations-based discovery: `HarnessHostAnnotation`; surface `params.annotations` on
   `Handle`/`list`.
3. `AgentProcess` `HarnessControl` group + handlers; stamp `HarnessHostAnnotation` at spawn.
4. `HarnessService` LayerSpec (Tier A + Tier B); migrate call sites; delete `AiContext.Service`
   and `AiSession.Service`.
5. Alarm blueprint (operations + bind); remove inline `AlarmToolkit`; persist alarm `message`.
6. Hook execution engine; planning `end-request` hook; remove `CompletionGuard`.
7. `StorageService.Key → Cell` rename.
8. Composer planning skill fix.

Each step is independently testable and (mostly) independently shippable; 1–3 are pure
additions, 4 is the breaking consolidation.

## 12. Open decisions

1. ~~**RPC transport now**~~: **Resolved** — in-memory `@effect/rpc` no-serialization
   client/server loopback behind `Handle.rpc` (§4.3). A worker transport can swap in the same
   `RpcGroup` contract later.
2. ~~**`#runRpc` defect policy**~~: **Resolved** — typed handler errors return to the caller over
   the loopback; defects/interrupts propagate as process failure (§4.3). Lifecycle accounting is
   intentionally not integrated (Tier-B calls happen within an active turn).
3. **`enqueueMessage` payload vs `submitInput`**: widen the `AgentEvent` `prompt` variant to
   `ContentBlock[]`. Decide whether the external work-queue API (`submitInput`) stays
   `string`-only while internal enqueue is rich content.
4. **Ephemeral stop/continue check**: keep (inside the hook fn) or drop.
5. **Tier-B accounting**: if a future Tier-B RPC can be issued _outside_ an active turn (e.g. a
   detached supervisor poking a hibernating agent), revisit whether `Handle.rpc` needs to bump
   `#activeHandlers` to prevent a race into `IDLE` before the durable effect persists.

## 13. Testing

- Process RPC: ~~unit-test accounting / failure isolation / durable side effects~~. Basic
  spawn-and-dispatch landed (`ProcessManager.test.ts` `rpcs`: `getValue`/`setValue` round-trip
  through per-process `StorageService`). Still TODO: failure isolation (typed error returned,
  process survives) and durable side effects across suspend/hydrate (alarm set via RPC).
- HarnessService: Tier A resolvable without a live process; Tier B returns `NotSupportedError`
  with no host and succeeds against a stamped host.
- Alarm blueprint: agent schedules a self-wake via the operation and is woken (TestClock).
- Plan hook: agent with incomplete plan tasks is reminded and continues; clean plan completes.
- Prefer the unified `TestLayer` / `AssistantTestLayer`; drive time with `TestClock`, avoid sleeps.
