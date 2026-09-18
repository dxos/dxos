# Process & Operation API redesign

Status: spec (no implementation yet).

Scope: the public shape of operations and processes in `@dxos/compute` /
`@dxos/compute-runtime`, and the ECHO entity kinds they need.

Five changes, specified independently but landing as one API break:

1. **Two new entity kinds**, `operation` and `process`, alongside `object` / `relation` /
   `type`. Neither is an object type, and neither is bound to automerge.
2. `Operation.Definition` becomes the operation-kind entity, **replacing**
   `Operation.PersistentOperation` and its lossy serialize/deserialize bridge.
3. `Process` stops being a callback bag and becomes the process-kind entity — a **live
   handle** with a URI, referenceable by `Ref`, observable.
4. Process implementations move into operations: `Operation.durableHandler` is a new
   **handler kind** carrying every semantic currently in `Process.make`.
5. A process has a **parent**, which may be another process or an ECHO object.

## 1. Before

Today three distinct things are called "process", and operations are modelled twice:

| Concern                          | Type                                                  | Location                               |
| -------------------------------- | ----------------------------------------------------- | -------------------------------------- |
| Process definition               | `Process.Process`, `Process.Callbacks`                | `compute/src/Process.ts`               |
| Process live instance (internal) | `ProcessManager.Handle`, `ProcessHandleImpl`          | `compute-runtime/src/ProcessHandle.ts` |
| Process read-only projection     | `Process.Info` + `Process.Monitor`                    | `Process.ts`, `ProcessMonitor.ts`      |
| Operation definition             | `Operation.Definition` (a plain value)                | `compute/src/Operation.ts`             |
| Operation database record        | `Operation.PersistentOperation` (an object-kind type) | `compute/src/Operation.ts:426`         |

Consequences we are removing:

- **Two vocabularies for one process.** A caller that spawns gets a `Handle`; a caller
  that observes gets an `Info`. The two are not convertible, so UI listing processes
  cannot act on one without going back to a manager.
- **Two models for one operation.** `serialize` / `deserialize` / `setFrom`
  (`Operation.ts:478-560`) convert between them on every registry sync, dropping the
  handler, narrowing `services: Context.Key[]` to `string[]`, and rendering the
  input/output codecs as JSON Schema.
- **`Process.make` is a second way to write a unit of work**, duplicating the operation
  metadata (`key`, `input`, `output`, `services`, `types`) its definition already has.
- **Processes are invisible to ECHO.** `Monitor.list(filter)` is a bespoke query language
  parallel to `Filter` / `Query`.

## 2. Entity kinds

A kind is not decoration. It fixes identity/addressing, which APIs accept the value, and
what a persisted projection looks like — but **not** where instances are stored. Storage
is orthogonal and per-entity.

```ts
export enum EntityKind {
  Object = 'object',
  Relation = 'relation',
  Type = 'type',
  Operation = 'operation', // a definition of behavior
  Process = 'process', // a running instance of behavior
}
```

|                      | Type                             | **Operation**                                         | **Process**                            |
| -------------------- | -------------------------------- | ----------------------------------------------------- | -------------------------------------- |
| Is a                 | definition of _shape_            | definition of _behavior_                              | _instance_ of behavior                 |
| Created by           | `Type.makeObject(dxn)(schema)`   | `Operation.make({ key, input, output, services, … })` | `manager.spawn(op, input, options)`    |
| Identity             | typename DXN, or EID when stored | key DXN (`dxn:<key>` and `dxn:<key>:<version>`)       | pid → `process://<runtime>/<pid>`      |
| Backing store        | registry, or a space (`addType`) | registry, **or** a space (`addOperation`)             | the compute runtime — **never stored** |
| Hidden slots         | source Effect Schema             | input/output codecs, `services`, `types`, handler     | scope, output queue, status atom, RPC  |
| Persisted projection | `jsonSchema`                     | `inputSchema`/`outputSchema`, `services: string[]`    | none                                   |
| `db.add()`           | rejected (`RejectTypeEntity`)    | rejected — persist deliberately via `addOperation`    | rejected — never a document            |

Mechanically, each kind needs what `type` needed when it was added as the third:

1. `internal/common/types/entity.ts:124` — the enum (`EntityKindSchema` follows).
2. `internal/Entity/operation-kind.ts`, `process-kind.ts` — pipeables modelled on
   `type-kind.ts`, stamping `[SchemaKindId]` and `TypeAnnotation.kind`.
3. `Entity.ts` / `Type.ts` — `isOperationKind` / `isProcessKind` and `AnyEntity` widening.
4. `Ref.ts:56-70` — one overload arm each, exactly where `Type.Type` got its arm.
5. `registry.ts` `getEntityUris` — the operation-key case, plus a bare-EID fallback (it
   returns `getEntityKeyDXNs` for non-type kinds, which is empty for an unkeyed entity).
6. `Database.ts:83` — `RejectOperationEntity` / `RejectProcessEntity` beside
   `RejectTypeEntity`, and `db.addOperation()` beside `db.addType()`.
7. `internal/Obj/create-object.ts:106-110` — the three-way kind-inference ladder becomes a
   lookup off `annotation.kind`.

Naming assumption: the kinds are named for the concepts (`operation`, `process`), not for
the variables (`definition`, `process`). Open — see §9.

## 3. Operation — the definition is the entity

`Operation.PersistentOperation` is deleted. `Operation.Definition` becomes the
operation-kind entity, keeping the same DXN so no data migration is required:

```ts
export class Definition extends Operation.makeDefinition<Definition>(
  DXN.make('org.dxos.type.function', '0.2.0'), // unchanged
)(Schema.Struct({ name, description, icon, inputSchema, outputSchema, services, binding, … })) {}
```

The live-only parts ride on hidden slots, as `Type` already does with its source schema:

| Slot                                   | Holds                          | Persisted projection         |
| -------------------------------------- | ------------------------------ | ---------------------------- |
| `InputSchemaSlot` / `OutputSchemaSlot` | the Effect `Schema.Codec`      | `inputSchema`/`outputSchema` |
| `ServicesSlot`                         | `readonly Context.Key[]`       | `services: string[]`         |
| `TypesSlot`                            | `readonly Type.AnyEntity[]`    | refs, or omitted             |
| `HandlerSlot`                          | plain / lazy / durable handler | never persisted              |

- `Operation.make(props)` yields the entity directly; meta already carries `key` and
  `version`, so it is addressable as `dxn:<key>` and `dxn:<key>:<version>`.
- **Registry or automerge, one entity either way.** A definition sourced from code lives
  in the registry; one persisted into a space lives in a document. `createRefResolver`
  already normalizes both to the same registered entity for types
  (`hypergraph.ts:214-218`); operations take the same path.
- `serialize` / `serializable` / `deserialize` / `setFrom` disappear. A record read from a
  space _is_ a Definition; its codecs rebuild lazily from `inputSchema`/`outputSchema` on
  first access (the `Type.getSchema` rebuild path), and an absent handler slot is the
  signal to invoke remotely — what `deserialize` encoded by omission.
- `Ref.Ref(Operation.Definition)` becomes usable: `Skill.tools` (bare `ToolId` strings
  today) and triggers stop round-tripping keys by hand.

**Instance ids must be derived from `key` + `version`, not random.** `Operation.make` is
called at module scope in hundreds of files, and module-scope RNG is forbidden under
workerd — the constraint `Type.makeObject` already documents. Deriving the id also makes
the in-process and persisted forms one entity rather than two.

## 4. Process — the live handle

`Process.Process` becomes the process-kind entity: the _instance_, not a factory. It is
what `spawn` returns, what a query result item is, and what `Monitor` used to describe.

```ts
export interface Process<_Input = any, _Output = any, _Rpcs extends Rpc.Any = never> {
  readonly uri: URI.URI; // process://<runtimeId>/<pid>
  readonly pid: ID;
  readonly operation: Ref.Ref<Operation.Definition>;
  readonly params: Params;
  readonly environment: Environment;
  readonly parent: Ref.Ref<Process | Obj.Any> | null; // §6

  // Observation.
  readonly status: Status; // { state, exit, startedAt, completedAt }
  readonly statusAtom: Atom.Atom<Status>;
  readonly metrics: Metrics;
  readonly error: SerializedError | null;
  subscribeOutputs(): Stream.Stream<_Output>;
  subscribeEphemeral(): Stream.Stream<Trace.Message>;
  children(): Effect.Effect<readonly Process[]>;

  // Control.
  submitInput(input: _Input): Effect.Effect<void>;
  terminate(): Effect.Effect<void>;
  runToCompletion(): Effect.Effect<void>;
  runUntilSettled(): Effect.Effect<void>;
  runAndExit(options: { readonly inputs: readonly _Input[] }): Stream.Stream<_Output>;
  readonly rpc: RpcClient.RpcClient<_Rpcs>;
}
```

- **`Info` is deleted.** Everything it carried is a field or a `status` field here.
- **Dormant vs live is a state, not a type.** `Handle.hydrate()` goes away; a process
  restored from the durable mailbox fails control calls with `ProcessNotLiveError` until
  the runtime hydrates it lazily on first use, which it can now do from the operation ref.
- **`Process.Monitor` / `ProcessMonitorService` are removed** (§7).
  `subscribeToTraceMessages` moves to `Trace.Monitor`, keeping its aggregate layer.
- `Status`, `State`, `Params`, `Environment`, `ChildEvent`, the annotations and the trace
  event types keep their current definitions.

## 5. Handler kinds

An operation declares _what_ it does (key, input, output, services, types). _How_ it is
implemented is a **handler kind** attached to the definition. `Operation.withHandler` —
an ordinary `(input) => Effect<O>` — is the baseline. Three declarative kinds sit beside
it:

| Kind             | Attached with                   | Body is                                             | Runs as                                        |
| ---------------- | ------------------------------- | --------------------------------------------------- | ---------------------------------------------- |
| **prompt**       | `Operation.promptHandler`       | a `Template.Template` rendered from the input       | one model call, output parsed to `output`      |
| **durable**      | `Operation.durableHandler`      | callbacks over a process context (§5.1)             | a long-lived process, suspend/resume capable   |
| **instructions** | `Operation.instructionsHandler` | natural-language instructions plus the tools to use | an agent turn that works until `output` is met |

Properties they share, and why they are kinds rather than three unrelated APIs:

- All four produce a **process** (§5.2). Only the durable kind writes its own lifecycle;
  the others are wrapped by an adapter that spawns, runs, submits output and succeeds.
- All four are addressed and invoked identically — by operation key, through
  `OperationHandlerSet`. A caller does not know or care which kind backs a definition,
  which is what lets an operation be reimplemented from code to instructions without
  touching its callers.
- Only the **kind marker** is part of the persisted projection; handler bodies are never
  persisted, with one exception worth deciding (§9): a prompt template and an
  instructions body are _data_, so an operation of those kinds could be fully defined in a
  space with no code at all.

`OperationHandlerSet` resolves kinds uniformly: `getHandlerFor(key)` returns the
definition with whichever handler slot is populated, and the runtime dispatches on the
marker. `Operation.lazyHandler` composes with each of them.

### 5.1 The durable kind

`Process.make`, `MakeProcessOpts`, `Process.Callbacks`, `ProcessContext` and
`Process.fromOperation` are removed. Their semantics become the durable handler:

```ts
export const durableHandler: {
  <Def extends Definition.Any>(create: Create<Def>): (op: Def) => WithDurableHandler<Def>;
  <Def extends Definition.Any>(op: Def, create: Create<Def>): WithDurableHandler<Def>;
};
```

- `DurableCallbacks` is today's `Process.Callbacks` verbatim — `onSpawn`, `onInput`,
  `onAlarm`, `onChildEvent`, `rpcHandlers`, defaulted to no-ops by the combinator.
- `DurableContext` is today's `ProcessContext` with `ctx.process` (the live `Process`)
  replacing `ctx.id` / `ctx.params`.
- Everything `MakeProcessOpts` declared already lives on `Definition`; the one addition is
  `rpcs`, which `Definition.Rpcs<Def>` feeds to `rpcHandlers` and `Process.rpc`.

### 5.2 One execution model

Every operation invocation is a process. The kinds differ only in who writes the
lifecycle:

| Handler kind                 | Runtime behavior                                                                                                                                            |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| code / prompt / instructions | Wrapped in the **default adapter** — today's `Process.fromOperation` body: idempotency marker, the four trace events, `submitOutput` + `succeed` on return. |
| durable                      | Runs as-is; the adapter's trace events are emitted by the runtime around `onSpawn`/`onInput`.                                                               |

`executionMode: 'sync'` stays a hint that the caller may await inline; it does not bypass
the process runtime.

### 5.3 Spawning

```ts
spawn<Def extends Operation.Definition.Any>(
  op: Def,
  input?: Operation.Definition.Input<Def>,
  options?: SpawnOptions,
): Effect.Effect<Process<Input<Def>, Output<Def>, Rpcs<Def>>>;

attach(uri: URI.URI): Effect.Effect<Process.Any, ProcessNotFoundError>;
```

`SpawnOptions.parentProcessId` is replaced by `parent` (§6); `name`, `target`, `traceMeta`,
`environment`, `notify` and `annotations` are unchanged.

## 6. Parentage

```ts
readonly parent: Ref.Ref<Process | Obj.Any> | null;

interface SpawnOptions {
  readonly parent?: Process.Any | Obj.Any | Ref.Ref<Process.Any | Obj.Any> | URI.URI;
}
```

- **Process parent** keeps today's semantics: trace-context inheritance, `onChildEvent`
  delivery, hibernation while a child runs, terminal-state cascade.
- **ECHO object parent** is ownership, not supervision: no `onChildEvent`, no cascade. It
  records what the process runs for and makes it discoverable from the object. It subsumes
  `TargetAnnotation`, kept for one release as a read-only alias.
- The parent's space seeds `Environment.space` when the caller did not set it.

A process holding `Ref<Process | Obj.Any>` is safe because the process is never persisted.
**The reverse is not**: an object must not persist a `Ref<Process>` — see §7.

## 7. Entity sources, queries and refs

The graph resolves and queries entities through two sources today: the registry
(`RegistryQuerySource` + the `dxn:` ref backend) and spaces (`SpaceQuerySource` + the
`echo://` backends). Generalize that into an **`EntitySource`** — query, resolve-by-URI,
change event — and the compute runtime registers as a third:

```ts
Query.select(Filter.type(Process, { state: Process.State.RUNNING }));
Query.select(Filter.type(Operation.Definition, { key: '…' }));
obj.pipe(Query.incoming(Process, 'parent')); // processes running for this object
```

- The ProcessManager is the authority for process entities; `RemoteProcessManager`
  registers as a second source under the same URI authority, so remote processes answer
  the same query rather than a parallel API. Results are live, driven by the same signal
  that feeds `statusAtom`.
- Results are `Process` values, directly controllable, subject to `ProcessNotLiveError`.
- `MonitorFilter`, `matchesFilter` and `listFromTree` are deleted. `Manager.list(options)`
  survives only as the runtime-local, non-reactive read.
- **A `Ref<Process>` resolves only where that runtime is reachable**, so it must never be
  written into a document — it would dangle on every other peer. Process refs are
  in-memory values; persisted schemas must not declare them.

## 8. Migration map

| Removed                                                            | Replacement                                             |
| ------------------------------------------------------------------ | ------------------------------------------------------- |
| `Operation.PersistentOperation`                                    | `Operation.Definition` (operation-kind entity)          |
| `Operation.serialize` / `serializable` / `deserialize` / `setFrom` | nothing — the definition is the entity                  |
| `Process.make`, `MakeProcessOpts`                                  | `Operation.make` + `Operation.durableHandler`           |
| `Process.Callbacks`, `ProcessContext`                              | `Operation.DurableCallbacks`, `DurableContext`          |
| `Process.fromOperation`                                            | implicit (default adapter, §5.2)                        |
| `Process.Info`                                                     | `Process` (§4)                                          |
| `Process.Monitor`, `ProcessMonitorService`, `ProcessMonitor.layer` | `EntitySource` + query (§7); `Trace.Monitor` for traces |
| `Process.MonitorFilter`, `matchesFilter`, `listFromTree`           | `Filter` / `Query`                                      |
| `ProcessManager.Handle`, `Handle.hydrate`                          | `Process`, lazy hydration                               |
| `SpawnOptions.parentProcessId`, `SpawnOptions.target`              | `SpawnOptions.parent`                                   |
| `Info.parentPid`                                                   | `Process.parent`                                        |

Call sites to update (non-exhaustive): `ProcessOperationInvoker`, `RemoteProcessManager`,
`RemoteProcessHandle`, `EdgeProcessManager`, `TriggerMonitor`, `process-store`,
`McpServer.ts:754`, `assistant-evals/mcp-host.ts:109`, `devtools/cli/util/runtime.ts:89`,
`plugin-routine/{layer-specs,registry-sync}.ts`,
`app-framework/plugin-process-manager`, `plugin-deck/notification-tracker`,
`plugin-client/trace-progress`, `plugin-assistant` hooks (`useSessionTimeline`,
`useProcessEphemeralStatus`), `assistant-test-layer`.

### 8.1 Reading existing operation records

Objects already stored under `org.dxos.type.function` carry `kind: 'object'` in their
document (`core-db/object-core.ts:568` defaults unknown kinds to `Object`). They load
without error but as the _wrong kind_, so the loader must derive the kind from the
typename rather than trusting the stored value. Nothing needs rewriting on disk.

`entityKind` also reaches stored JSON Schema and is decoded strictly
(`JsonSchema/json-schema.ts:585`), so a peer on an older build fails to decode a
_persisted_ operation-kind entity. This does not affect processes (never stored) or
registry-only operations. Either make `EntityKindSchema` decode unknown values to a
sentinel before persisted operations ship, or keep them registry-only until it lands.

## 9. Open questions

1. Kind naming — `operation` / `process` as written, or `definition` / `process`.
2. URI authority for processes: `process://<runtimeId>/<pid>` needs a runtime id stable
   across restart for durable processes; the alternative is `process:///<pid>` with the
   runtime carried in `Environment`.
3. Reaping policy for terminal processes — how long a query still sees a finished process.
4. Whether `rpcs` belongs on `Definition` (and so in its persisted projection) or only on
   the durable handler.
5. Whether `Type.AnyEntity` widening should explicitly forbid naming an operation or
   process in `Definition.types`.
6. Whether the plain code handler counts as a fourth handler kind or as the baseline the
   other three are declared against (§5).
7. Whether a prompt template or an instructions body belongs in the persisted projection.
   If it does, an operation of those kinds is fully defined by data — authored in a space,
   with no code deployed — which is a larger claim than the rest of this spec makes.
