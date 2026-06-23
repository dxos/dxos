# Agent Harness Refactor — Design Spec

Status: draft / design-only (no implementation yet)

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

| Plane             | Mechanism                         | Semantics                                  |
| ----------------- | --------------------------------- | ------------------------------------------ |
| Work queue        | `Handle.submitInput` / input events | Durable, ordered, replayed on hydrate      |
| Control plane     | Process RPC (`@effect/rpc`)       | Transient, request/response, live-only     |
| Durable state     | `StorageService`                  | Per-process persisted key/value            |
| Identity / role   | `Process.Params.annotations`      | Set once at spawn, immutable, discoverable |

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

Liveness is guaranteed by construction: a Tier-B-using operation is spawned *during the
agent's turn*, which runs inside the live agent process. The owner is therefore always live
when Tier B is invoked; `NotSupportedError` is a resolution-time concern (no agent owns this
conversation — stories, standalone sessions), not a runtime race.

## 4. Process RPC control plane (generic, in `@dxos/compute` + `@dxos/compute-runtime`)

Add an optional typed control surface to processes, built on `@effect/rpc` (already present
in the dependency tree at `@effect/rpc@0.75.1`).

### 4.1 Definition surface

```ts
// Process.ts
export interface MakeProcessOpts {
  readonly key: string;
  readonly input: Schema.Schema.AnyNoContext;
  readonly output: Schema.Schema.AnyNoContext;
  readonly services: readonly Context.Tag<any, any>[];
  readonly rpc?: RpcGroup.RpcGroup<any>; // control plane (optional)
}

export interface Callbacks<I, O, R> {
  onSpawn(): Effect.Effect<void, never, R | BaseServices>;
  onInput(input: I): Effect.Effect<void, never, R | BaseServices>;
  onAlarm(): Effect.Effect<void, never, R | BaseServices>;
  onChildEvent(event: ChildEvent<unknown>): Effect.Effect<void, never, R | BaseServices>;
  // Handlers for the rpc group declared on the definition. Live in create()'s scope,
  // closing over the same state as the lifecycle callbacks.
  rpcHandlers?: /* RpcGroup.Handlers for Opts['rpc'] */;
}
```

### 4.2 Handle surface

```ts
// ProcessManager.Handle<I, O>
readonly rpc: RpcClient.RpcClient<G>; // typed client over the definition's rpc group
```

For a future worker boundary, a remote/proxy handle implements the same `rpc` client over a
serialized transport; same interface.

### 4.3 Runtime semantics — `#runRpc` (the riskiest piece)

An RPC invocation reuses the existing `#runHandler` machinery in `ProcessHandleImpl` to get,
for free:

- `#activeHandlers++` accounting → process cannot go `IDLE`/`SUCCEEDED` while an RPC is
  in-flight;
- execution with `this.#services` inside the process scope → handlers can use
  `StorageService`, the closed-over `AlarmManager`/`inputQueue`;
- post-settle `persistence.setAlarm(this.#alarmDueAt)` + `setState` → a `setAlarm` RPC's
  durable effect is captured exactly like an `onAlarm` turn.

It MUST diverge from `#runHandler` in one way:

- **Failure isolation.** `#runHandler` routes all failures into `#handleError → #failImmediately`
  (kills the process). For RPC, a typed handler error must be returned to the **caller**; only
  defects / interruptions propagate to process failure.

Other rules:

- RPCs are **not** appended to the durable mailbox (`appendEvent`) — they are live-only.
  Their *side effects* persist via the handler (e.g. `alarmManager.setWakeAt` → `StorageService`).
- RPC handlers run **concurrently** with an in-flight `onAlarm`/`onInput` (same shared
  handler-concurrency model that the tool-result path already relies on). Tier-B handlers are
  pure state mutations + `reconcile`, so this is safe.

```ts
// ProcessHandleImpl
request<Req, Res, Err>(rpc: Rpc<Req, Res, Err>, payload: Req): Effect.Effect<Res, Err> {
  // activeHandlers++, setStatus(RUNNING), run handler with #services in scope,
  // persist alarm+state after settle, decrement + recompute idle/hybernating;
  // typed Err -> caller; defect/interrupt -> process failure.
}
```

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
yield* processManager.spawn(executable, {
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
  call** (so a model-switch process replacement isn't captured stale), then call its RPC:

```ts
const owningAgent = Effect.gen(function* () {
  const procs = yield* pm.list({ target: context.conversation });
  const host = procs.find(
    (p) =>
      !isTerminal(p.status.state) &&
      Option.getOrElse(
        Annotation.getDictionary(p.params.annotations, Process.HarnessHostAnnotation),
        () => false,
      ),
  );
  return host ?? (yield* Effect.fail(new NotSupportedError()));
});
```

### 6.1 AgentProcess control group

Defined and implemented by `AgentProcess` (it owns the state):

```ts
class HarnessControl extends RpcGroup.make(
  Rpc.make('setAlarm', {
    payload: { at: Schema.DateTimeUtc, message: Schema.NullOr(Schema.String) },
    success: Schema.Void,
  }),
  Rpc.make('enqueueMessage', {
    payload: { content: Schema.Array(ContentBlock.Any) },
    success: Schema.Void,
  }),
) {}

// in AgentProcess create(), alongside onInput/onAlarm:
rpcHandlers: HarnessControl.toLayer({
  setAlarm: ({ at, message }) => alarmManager.setWakeAt(DateTime.toEpochMillis(at), message),
  enqueueMessage: ({ content }) =>
    Effect.gen(function* () {
      inputQueue.push({ _tag: 'prompt', content });
      yield* AgentEventsKey.set(inputQueue);
      alarmManager.reconcile(true);
    }),
});
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

1. Generic process RPC surface: `Process.make` `rpc` group, `Callbacks.rpcHandlers`,
   `Handle.rpc`, `ProcessHandleImpl.#runRpc` (with failure isolation). In-memory dispatch.
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

1. **RPC transport now**: in-memory direct dispatch behind `Handle.rpc` (recommended), with
   `@effect/rpc` `RpcServer`/`RpcClient` over a worker transport deferred until the worker
   boundary exists. Confirm we define the `RpcGroup` contract now regardless.
2. **`enqueueMessage` payload vs `submitInput`**: widen the `AgentEvent` `prompt` variant to
   `ContentBlock[]`. Decide whether the external work-queue API (`submitInput`) stays
   `string`-only while internal enqueue is rich content.
3. **Ephemeral stop/continue check**: keep (inside the hook fn) or drop.
4. **`#runRpc` defect policy**: do defects in an RPC handler fail the whole process, or only
   the call? (Proposed: typed errors → caller; defects/interrupts → process failure.)

## 13. Testing

- Process RPC: unit-test `#runRpc` accounting (no premature idle), failure isolation (typed
  error returned, process survives), and durable side effects (alarm set via RPC survives
  suspend/hydrate).
- HarnessService: Tier A resolvable without a live process; Tier B returns `NotSupportedError`
  with no host and succeeds against a stamped host.
- Alarm blueprint: agent schedules a self-wake via the operation and is woken (TestClock).
- Plan hook: agent with incomplete plan tasks is reminded and continues; clean plan completes.
- Prefer the unified `TestLayer` / `AssistantTestLayer`; drive time with `TestClock`, avoid sleeps.
