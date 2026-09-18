# Process API redesign

Status: spec (no implementation yet).

Scope: the public shape of processes in `@dxos/compute` / `@dxos/compute-runtime`.
Four changes, specified independently but landing as one API break:

1. `Process` stops being a callback bag and becomes a **live handle** — a first-class
   public value with a URI, referenceable by `Ref`, observable.
2. Process implementations move into operations: `Operation.durableHandler` is a new
   **handler kind** that carries every semantic currently in `Process.make` +
   `ProcessHandleImpl`.
3. A process has a **parent**, which may be another process *or an ECHO object*.
4. Processes are exposed to the **ECHO query API**.

## 1. Before

Today three distinct things are called "process":

| Concern | Type | Location |
| --- | --- | --- |
| Definition (factory + callbacks) | `Process.Process<I, O, R, Rpcs>`, `Process.Callbacks` | `compute/src/Process.ts` |
| Live instance (runtime-internal) | `ProcessManager.Handle`, `ProcessHandleImpl` | `compute-runtime/src/ProcessHandle.ts` |
| Read-only projection | `Process.Info` + `Process.Monitor` | `compute/src/Process.ts`, `compute-runtime/src/ProcessMonitor.ts` |

Consequences we are removing:

- **Two vocabularies for one thing.** A caller that spawns gets a `Handle`; a caller
  that observes gets an `Info` from `Monitor.list()`. The two are not convertible, so
  UI code that lists processes cannot act on one without going back to a manager.
- **`Process.make` is a second way to write a unit of work.** Every process in the repo
  is either `Process.fromOperation(op, handlers)` or a hand-written `Process.make` that
  duplicates operation metadata (`key`, `input`, `output`, `services`, `types`).
- **Parentage is a bare `parentPid`.** A process spawned on behalf of an ECHO object
  records that object only as the loose `TargetAnnotation` URI, which nothing resolves.
- **Processes are invisible to ECHO.** `Monitor.list(filter)` is a bespoke query
  language (`key`/`target`/`state`/`space`/`parentPid`) parallel to `Filter`/`Query`.

## 2. After — `Process` is the live handle

`Process.Process` becomes the *instance*, not the factory. It is public API: it is what
`spawn` returns, what a query result item is, and what `Monitor` used to describe.

```ts
export interface Process<_Input = any, _Output = any, _Rpcs extends Rpc.Any = never> {
  readonly [ProcessTypeId]: Process.Variance<_Input, _Output, _Rpcs>;

  /** Stable identity. `process://<runtimeId>/<pid>`, or `echo://<spaceId>/<pid>` when space-scoped. */
  readonly uri: URI.URI;
  readonly pid: ID;

  /** Operation key this process runs ({@link Operation.Definition.meta.key}). */
  readonly key: DXN.DXN;
  readonly params: Params;
  readonly environment: Environment;

  /** @see §4. */
  readonly parent: Ref.Ref<Process | Obj.Any> | null;

  // --- observation -------------------------------------------------------
  readonly status: Status;                     // { state, exit, startedAt, completedAt }
  readonly statusAtom: Atom.Atom<Status>;
  readonly metrics: Metrics;                   // wallTime / inputCount / outputCount
  readonly error: SerializedError | null;
  subscribeOutputs(): Stream.Stream<_Output>;
  subscribeEphemeral(): Stream.Stream<Trace.Message>;
  children(): Effect.Effect<readonly Process[]>;

  // --- control -----------------------------------------------------------
  submitInput(input: _Input): Effect.Effect<void>;
  terminate(): Effect.Effect<void>;
  runToCompletion(): Effect.Effect<void>;
  runUntilSettled(): Effect.Effect<void>;
  runAndExit(options: { readonly inputs: readonly _Input[] }): Stream.Stream<_Output>;
  readonly rpc: RpcClient.RpcClient<_Rpcs>;
}
```

Notes on the shape:

- **`Info` is deleted.** Everything it carried (`pid`, `key`, `params`, `environment`,
  `state`, `error`, `startedAt`, `completedAt`, `metrics`) is a field or a `status`
  field on `Process`. A serialized process crossing a boundary is
  `Process.Encoded` — the `Schema` below — and is rehydrated into a `Process` by the
  receiving runtime, so remote and local processes have one type at the call site.
- **Dormant vs live is a state, not a type.** `ProcessManager.Handle.hydrate()` is
  removed; a process read out of durable storage is a `Process` whose control methods
  fail with `ProcessNotLiveError` until the runtime hydrates it, which it now does
  lazily on first `submitInput`/`rpc` using the operation registry (it can: a process
  is identified by an operation key, §3).
- **`Process.Monitor` / `ProcessMonitorService` are removed**, replaced by §5.
  `subscribeToTraceMessages(filter)` moves to `Trace.Monitor` (it is a trace concern,
  not a process-tree concern) and keeps its current aggregate local+remote layer.
- `Status`, `State`, `Params`, `Environment`, `ChildEvent`, the annotations and the
  trace event types keep their current definitions and names.

### 2.1 Schema and Ref

```ts
/** Canonical wire/query form; also the ECHO projection (§5). */
export const Process: Schema.Schema<Process, Process.Encoded>;

export const Uri: Schema.Schema<URI.URI>;          // process:// | echo://
export const isProcess: (value: unknown) => value is Process.Any;
```

A `Ref.Ref<Process>` is resolvable because the runtime contributes a `RefResolver` for
the `process://` authority and for `echo://` URIs whose entity id is a live pid. That
resolver is what makes `parent` (§4) and any user-held reference work; an ECHO object
may therefore store `Ref<Process>` in a field and dereference it like any other ref.
Resolution of a terminated process yields the last persisted snapshot (a `Process` in a
terminal state), never a dangling ref.

## 3. After — the implementation is an operation's durable handler

`Process.make`, `Process.MakeProcessOpts`, `Process.Callbacks`, `Process.ProcessContext`
and `Process.fromOperation` are removed from the public surface. Their semantics move to
a second handler kind on `Operation`:

```ts
export const DurableHandlerTypeId = '~@dxos/operation/DurableHandler';

export interface WithDurableHandler<Def extends Definition.Any> extends Def {
  readonly [DurableHandlerTypeId]: {
    readonly create: (ctx: DurableContext<Definition.Input<Def>, Definition.Output<Def>>) =>
      Effect.Effect<Partial<DurableCallbacks<…>>, never, Definition.Services<Def> | BaseServices | Scope.Scope>;
  };
}

export const durableHandler: {
  <Def extends Definition.Any>(create: Create<Def>): (op: Def) => WithDurableHandler<Def>;
  <Def extends Definition.Any>(op: Def, create: Create<Def>): WithDurableHandler<Def>;
};
```

- `DurableCallbacks` is today's `Process.Callbacks` verbatim: `onSpawn`, `onInput`,
  `onAlarm`, `onChildEvent`, `rpcHandlers`, all defaulted to no-ops by the combinator.
- `DurableContext` is today's `ProcessContext` with one change: `ctx.process` replaces
  `ctx.id`/`ctx.params` and is the live `Process` handle for self (§2), so a handler can
  hand its own URI to something it spawns or writes.
- Everything `MakeProcessOpts` declared is already on `Definition`: `key`, `input`,
  `output`, `services`, `types`. The one addition is `rpcs`:

  ```ts
  Operation.make({ …, rpcs?: RpcGroup.RpcGroup<any> })
  ```

  which is what `Definition.Rpcs<Def>` extracts for `DurableCallbacks.rpcHandlers` and
  for `Process<I, O, Rpcs>.rpc`.

### 3.1 One execution model

Every operation invocation is a process. The distinction between the two handler kinds
is only how the body is written:

| Handler | Written as | Runtime behavior |
| --- | --- | --- |
| `Operation.withHandler` | `(input) => Effect<O>` | Wrapped in the **default durable adapter** — the current body of `Process.fromOperation`: idempotency marker, `Trace.OperationStart/Input/Output/End`, `submitOutput` + `succeed` on return, `OperationEnd(failure)` + die on defect. |
| `Operation.durableHandler` | callbacks over a context | Runs as-is; the adapter's trace events are emitted by the runtime around `onSpawn`/`onInput` instead of inside the handler. |

`executionMode: 'sync'` remains a hint that the caller may await inline; it does not
bypass the process runtime.

`OperationHandlerSet` gains `getDurableHandlerFor(key)` alongside `getHandlerFor`, and
`Operation.isDurable(op)` selects the path. `Operation.lazyHandler` accepts a module
whose default is `WithDurableHandler<Def>` under the same typed pairing.

### 3.2 Spawning

`ProcessManager.Manager.spawn` takes an operation, not a process definition:

```ts
spawn<Def extends Operation.Definition.Any>(
  op: Def,
  input?: Operation.Definition.Input<Def>,      // spawn-and-submit in one step
  options?: SpawnOptions,
): Effect.Effect<Process<Input<Def>, Output<Def>, Rpcs<Def>>>;

attach(uri: URI.URI): Effect.Effect<Process.Any, ProcessNotFoundError>;
```

`SpawnOptions.parentProcessId` is replaced by `parent` (§4); everything else
(`name`, `target`, `traceMeta`, `environment`, `notify`, `annotations`) is unchanged.
`ProcessOperationInvoker` keeps its shape but returns `Process` from `invokeFiber`
rather than an `OperationFiber` wrapper over a hidden handle.

## 4. Parentage

```ts
readonly parent: Ref.Ref<Process | Obj.Any> | null;

interface SpawnOptions {
  /** Parent process, or the ECHO object this process runs on behalf of. */
  readonly parent?: Process.Any | Obj.Any | Ref.Ref<Process.Any | Obj.Any> | URI.URI;
}
```

- **Process parent** keeps today's semantics exactly: trace-context inheritance,
  `onChildEvent` delivery to the parent, hibernation while a child runs, and the
  parent's terminal state cascading termination to children.
- **ECHO object parent** is new and is *not* a supervision relationship: no
  `onChildEvent`, no cascade. It records ownership — "this process is running for that
  document/conversation/queue" — and makes the process discoverable from the object
  (`Process.list({ parent: obj })`, or a query, §5). It subsumes `TargetAnnotation`,
  which is deprecated: `spawn({ target })` folds into `parent` and the annotation is
  kept for one release as a read-only alias.
- The parent's space, when it has one, seeds `Environment.space` if the caller did not
  set it.

An object-parented process does not keep the object alive and is not deleted with it;
resolving `parent` on a deleted object yields a tombstone ref like any other.

## 5. Processes in the ECHO query API

Processes are projected as queryable entities under a system type:

```ts
Query.select(Filter.type(Process, { key: '…', state: Process.State.RUNNING }))
Query.select(Filter.ids(processUri))
obj.pipe(Query.incoming(Process, 'parent'))   // processes running for this object
```

Mechanics:

- The runtime registers a **`ProcessQuerySource`** with each space's query engine (the
  same extension point remote/agent sources already use). It answers over the union of
  live processes in this runtime and non-terminal durable records, and it is **live**:
  results update on every state transition, driven by the same signal that feeds
  `statusAtom` today.
- Results are `Process` values (§2), not snapshots — a query result item is directly
  controllable (`terminate()`, `submitInput`) subject to `ProcessNotLiveError`.
- Remote processes participate through the existing `RemoteProcessManager`, which
  becomes a second source behind the same query rather than a second list API.
- Processes are **not** stored as ECHO documents. They are a virtual source: no
  Automerge doc, no replication, no history. Terminal processes fall out of query
  results once their durable record is reaped.
- Filterable fields: `key`, `state`, `parent`, `space`, `params.name`, and annotations.
  That is a superset of `MonitorFilter`, which is deleted along with
  `matchesFilter`/`listFromTree`; `Manager.list(options)` survives only as the
  runtime-local, non-reactive read.

## 6. Migration map

| Removed | Replacement |
| --- | --- |
| `Process.make`, `MakeProcessOpts` | `Operation.make` + `Operation.durableHandler` |
| `Process.Callbacks`, `ProcessContext` | `Operation.DurableCallbacks`, `Operation.DurableContext` |
| `Process.fromOperation` | implicit (default durable adapter, §3.1) |
| `Process.Info` | `Process` (§2) |
| `Process.Monitor`, `ProcessMonitorService`, `ProcessMonitor.layer` | ECHO query (§5) + `Trace.Monitor` for `subscribeToTraceMessages` |
| `Process.MonitorFilter`, `matchesFilter`, `listFromTree` | `Filter` / `Query` |
| `ProcessManager.Handle`, `Handle.hydrate` | `Process`, lazy hydration |
| `SpawnOptions.parentProcessId`, `SpawnOptions.target` | `SpawnOptions.parent` |
| `Info.parentPid` | `Process.parent` |

Call sites to update (non-exhaustive): `ProcessOperationInvoker`, `RemoteProcessManager`,
`RemoteProcessHandle`, `EdgeProcessManager`, `TriggerMonitor`, `process-store`,
`app-framework/plugin-process-manager`, `plugin-deck/notification-tracker`,
`plugin-client/trace-progress`, `plugin-assistant` hooks (`useSessionTimeline`,
`useProcessEphemeralStatus`), `assistant-test-layer`.

## 7. Open questions

1. URI authority for non-space processes — `process://<runtimeId>/<pid>` requires a
   stable runtime id that survives restart for durable processes; alternative is
   `process:///<pid>` (local) with the runtime id carried in `Environment`.
2. Whether `Ref<Process>` stored on an ECHO object should be allowed to persist at all,
   given a process is not replicated — a ref that only ever resolves on the runtime that
   owns the process may be better modeled as a plain URI field.
3. Reaping policy for terminal processes, which decides how long a query can still see a
   finished process and how long a stored ref resolves.
4. Whether `rpcs` belongs on `Operation.Definition` (serialized into the registry) or
   only on the durable handler.
