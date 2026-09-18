# Process & Operation API redesign

Status: spec (no implementation yet).

Scope: the public shape of operations and processes in `@dxos/compute` /
`@dxos/compute-runtime`, and the ECHO entity kinds they need.

Five changes, specified independently but landing as one API break:

1. **Entity kinds become open.** ECHO owns the mechanism and knows nothing about
   operations or processes; `@dxos/compute` registers the two new kinds. Neither is an
   object type, and neither is bound to automerge.
2. `Operation.Definition` becomes the operation-kind entity, **replacing**
   `Operation.PersistentOperation` and its lossy serialize/deserialize bridge.
3. `Process` stops being a callback bag and becomes the process-kind entity — a **live
   handle** with a URI, referenceable by `Ref`, observable.
4. An operation's implementation becomes a **handler kind**: code, script, prompt,
   instructions or durable. `durable` carries every semantic currently in `Process.make`;
   `script` absorbs `Script.Script` and its deploy-created operation record.
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

## 2. Open entity kinds

**ECHO must know nothing about operations or processes.** It owns the _mechanism_ —
entities have a kind, kinds decide addressing and storability — and `@dxos/compute`
registers the two new kinds against it. Nothing in `@dxos/echo` names either one.

That means the closed enum goes:

```ts
// @dxos/echo — an open brand, plus the three kinds ECHO itself owns.
export type EntityKind = string & Brand.Brand<'EntityKind'>;
export const EntityKind = { Object: …, Relation: …, Type: … } as const;

// Decodes ANY kind — an unknown kind is data, not a parse error.
export const EntityKindSchema = Schema.String.pipe(Schema.brand('EntityKind'));

export interface KindDescriptor {
  readonly kind: EntityKind;
  /** URIs an instance is indexed and resolved under (registry + ref resolution). */
  readonly addressing: (entity: Entity.Unknown) => readonly URI.URI[];
  /** Whether instances may be written into a document. */
  readonly storage: 'document' | 'external';
}

export const registerKind: (descriptor: KindDescriptor) => void;
```

and `@dxos/compute` registers:

| Kind        | `storage`  | `addressing`                          |
| ----------- | ---------- | ------------------------------------- |
| `operation` | `document` | `dxn:<key>` and `dxn:<key>:<version>` |
| `process`   | `external` | `process://<runtimeId>/<pid>`         |

A kind fixes identity/addressing, which APIs accept the value, and what a persisted
projection looks like — but **not** where instances live. Storage is orthogonal and
per-entity: an operation may sit in the registry _or_ in a space document; a process lives
in the compute runtime and is never stored.

|                      | Type                             | **Operation**                                         | **Process**                            |
| -------------------- | -------------------------------- | ----------------------------------------------------- | -------------------------------------- |
| Is a                 | definition of _shape_            | definition of _behavior_                              | _instance_ of behavior                 |
| Created by           | `Type.makeObject(dxn)(schema)`   | `Operation.make({ key, input, output, services, … })` | `manager.spawn(op, input, options)`    |
| Identity             | typename DXN, or EID when stored | key DXN                                               | pid                                    |
| Backing store        | registry, or a space (`addType`) | registry, **or** a space (`addOperation`)             | the compute runtime — **never stored** |
| Hidden slots         | source Effect Schema             | input/output codecs, `services`, `types`, handler     | scope, output queue, status atom, RPC  |
| Persisted projection | `jsonSchema`                     | `inputSchema`/`outputSchema`, `services: string[]`    | none                                   |

### 2.1 Making the mechanism generic

Each of these is a place ECHO currently hard-codes its three kinds. Opening them is the
whole of the ECHO-side work; none of it mentions operations or processes.

1. `internal/common/types/entity.ts:124` — enum → brand + descriptor registry;
   `EntityKindSchema` → open string. `EchoTypeSchema` is already generic over
   `K extends EntityKind` (`internal/Entity/entity.ts:63`) and needs no change.
2. `internal/Entity/type-kind.ts` — generalize `EchoTypeKindSchema` into
   `makeEntityType(kind, dxn)(schema)`. The type-kind pipeable becomes one call of it;
   `Operation.makeDefinition` and the process type factory are two more, declared in
   `@dxos/compute`.
3. `internal/Obj/create-object.ts:106-110` — the three-way kind-inference ladder becomes a
   read of `annotation.kind`.
4. `registry.ts` `getEntityUris` — the type-kind special case becomes
   `descriptor.addressing(entity)`, with the existing behavior registered as the `type`
   descriptor. (It falls back to `getEntityKeyDXNs`, which is empty for an unkeyed entity —
   a bare-EID fallback is worth adding as the default.)
5. `Ref.ts:56-70` — the per-kind overload arms (object, relation, `Type.Type`,
   `UnknownTypeSchema`) collapse into **one** arm over any entity type of any registered
   kind. Fewer arms than today, and no new ones per kind.
6. `Database.ts:83` — `RejectTypeEntity` hard-codes `EntityKind.Type`. Replace it with a
   capability brand: `db.add()` bounds on kinds whose descriptor is `storage: 'document'`,
   so ECHO rejects by _capability_ rather than by naming a kind. The runtime check reads
   the same descriptor. `db.addType()` gets a generic sibling (`db.addEntity(kind, …)`, or
   a per-kind entry point contributed by the registering package) for the deliberate
   persist path.

### 2.2 What an unregistered kind must do

Once kinds are open, a peer can receive an entity whose kind it has never heard of — a
space holding operations opened by a client that did not load `@dxos/compute`. The
decoder must surface it as an opaque `Entity.Unknown` carrying its kind string, never
fail. This is strictly better than the closed enum, which decodes `entityKind` with
`Schema.decodeSync` today (`JsonSchema/json-schema.ts:585`) and would throw.

## 3. Operation — the definition is the entity

`Operation.PersistentOperation` is deleted. An operation definition is no longer a plain
value shadowed by a separate database record: **it is an instance of the operation kind**,
which `@dxos/compute` registers once (§2) under the existing `org.dxos.type.function`
v0.2.0 DXN, so stored data needs no migration.

For a consumer, almost nothing changes at the point of definition — `Operation.make`
already produces what is now the entity:

```ts
// packages/plugins/plugin-markdown/src/types/MarkdownOperation.ts — unchanged today.
export const Create = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.markdown.create'),
    name: 'Create',
    description: 'Creates a new markdown document and adds it to the space.',
    icon: 'ph--file-text--regular',
  },
  services: [Database.Service],
  input: Schema.Struct({ name: Schema.String, content: Schema.String }),
  output: Schema.Struct({ object: Type.getSchema(Markdown.Document) }),
});
```

What changes is what that value now _is_ — an entity with a URI, so it can be referenced,
resolved, queried and (optionally) persisted:

```ts
Type.getURI(Create); // 'dxn:org.dxos.operation.markdown.create'
Obj.getMeta(Create).key; // the registry key — already true today
```

### 3.1 Attaching a handler

Unchanged for the code kind; the other kinds are siblings (§5):

```ts
export default Create.pipe(
  Operation.withHandler(({ name, content }) =>
    Effect.gen(function* () {
      const db = yield* Database.Service;
      return { object: db.add(Markdown.make({ name, content })) };
    }),
  ),
);
```

### 3.2 Referencing an operation

The reason to make it an entity. Today a reference to an operation is a bare string
(`Skill.tools: Array(ToolId)`) resolved by convention; it becomes an ordinary ref:

```ts
// In a schema.
export class Trigger extends Type.makeObject<Trigger>(DXN.make('org.dxos.type.trigger', '0.1.0'))(
  Schema.Struct({
    operation: Ref.Ref(Operation.Definition), // was: Schema.String
    input: Schema.Any,
  }),
) {}

// At a call site.
const op = yield * trigger.operation.load(); // Operation.Definition
const result = yield * Operation.invoke(op, trigger.input);
```

`Ref` resolution needs nothing new: the operation-kind descriptor indexes instances under
`dxn:<key>` and `dxn:<key>:<version>` (§2), which the registry ref backend already serves.

### 3.3 Where the definition lives

Registry or space document, **one entity either way** — the same registry-first,
db-second path `Type` already takes (`hypergraph.ts:214-218`):

```ts
// From code: contributed by a plugin, resolvable process-wide.
graph.registry.add([Create]);

// From a space: authored or deployed, replicated, resolvable by any peer that opens it.
yield * db.addOperation(Create);

// Either way, one query.
const ops = yield * db.query(Filter.type(Operation.Definition)).from(Scope.registry()).run();
```

### 3.4 What rides where

The parts a database cannot hold live on hidden slots, as `Type` already does with its
source Effect Schema:

| Slot                                   | Holds                          | Persisted projection         |
| -------------------------------------- | ------------------------------ | ---------------------------- |
| `InputSchemaSlot` / `OutputSchemaSlot` | the Effect `Schema.Codec`      | `inputSchema`/`outputSchema` |
| `ServicesSlot`                         | `readonly Context.Key[]`       | `services: string[]`         |
| `TypesSlot`                            | `readonly Type.AnyEntity[]`    | refs, or omitted             |
| `HandlerSlot`                          | plain / lazy / durable handler | never persisted              |

So `serialize` / `serializable` / `deserialize` / `setFrom` (`Operation.ts:478-560`)
disappear. A definition read back from a space _is_ a `Definition`; its codecs rebuild
lazily from `inputSchema`/`outputSchema` on first access (the `Type.getSchema` rebuild
path), and an absent handler slot is the signal to invoke remotely — exactly what
`deserialize` encoded by omission.

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
implemented is a **handler kind** attached to the definition. `Operation.withHandler` — an
ordinary `(input) => Effect<O>` — is the baseline. Four kinds sit beside it:

| Kind             | Attached with                   | Body is                                             | Runs as                                        |
| ---------------- | ------------------------------- | --------------------------------------------------- | ---------------------------------------------- |
| **script**       | `Operation.scriptHandler`       | user-authored source, bundled and deployed to EDGE  | a remote invocation of the deployed function   |
| **prompt**       | `Operation.promptHandler`       | a `Template.Template` rendered from the input       | one model call, output parsed to `output`      |
| **instructions** | `Operation.instructionsHandler` | natural-language instructions plus the tools to use | an agent turn that works until `output` is met |
| **durable**      | `Operation.durableHandler`      | callbacks over a process context                    | a long-lived process, suspend/resume capable   |

Properties they share, and why they are kinds rather than five unrelated APIs:

- All of them produce a **process** (§5.2). Only the durable kind writes its own
  lifecycle; the rest are wrapped by an adapter that spawns, runs, submits output and
  succeeds.
- All of them are addressed and invoked identically — by operation key, through
  `OperationHandlerSet`. A caller does not know or care which kind backs a definition,
  which is what lets an operation be reimplemented from code to script to instructions
  without touching its callers.
- Three of them — script, prompt, instructions — have bodies that are **data**
  (`Ref<Text>` or a `Template.Template`), so those operations can be authored and
  redefined in a space with no code deployed. Script already works that way today, which
  is the existence proof; §9.8 is whether prompt and instructions follow it into the
  persisted projection.

`OperationHandlerSet` resolves kinds uniformly: `getHandlerFor(key)` returns the
definition with whichever handler slot is populated, and the runtime dispatches on the
marker. `Operation.lazyHandler` composes with each of them.

### 5.1 Defining each kind

**Code** — the baseline, as today (§3.1): `Op.pipe(Operation.withHandler((input) => …))`.

**Durable.** `Process.make`, `MakeProcessOpts`, `Process.Callbacks`, `ProcessContext` and
`Process.fromOperation` are removed; their semantics become a handler attached to an
ordinary definition. Today's `AgentProcess`
(`agent-runtime/src/agent-service/agent-process.ts:106`) re-declares `key`, `input`,
`output`, `types` and `services` beside the operation that spawns it; after, it declares
them once:

```ts
export const RunAgent = Operation.make({
  meta: { key: DXN.make('org.dxos.operation.agent.run'), name: 'Run Agent' },
  input: Schema.Union([Schema.String, Schema.Array(ContentBlock.Any)]),
  output: Schema.Void,
  types: [Chat.Chat, Feed.Feed, Message.Message, Alarm.Alarm],
  services: [Database.Service, AiService.AiService, StorageService.StorageService],
  rpcs: HarnessControl, // the one field moving onto `make`.
});

export default RunAgent.pipe(
  Operation.durableHandler((ctx) =>
    Effect.gen(function* () {
      // Runtime state lives in this scope, exactly as `Process.make`'s `create` does today.
      const chat = yield* Database.resolve(/* … */).pipe(Effect.orDie);

      return {
        onSpawn: () => Effect.void,
        onInput: (prompt) =>
          Effect.gen(function* () {
            yield* runTurn(chat, prompt);
            yield* ctx.setAlarm(UNSEEN_WRITE_RETRY_MS); // suspend, resume later
          }),
        onAlarm: () => drainPendingWrites(chat),
        onChildEvent: (event) => handleSubAgent(event),
        rpcHandlers: HarnessControl.toLayer({/* … */}),
      };
    }),
  ),
);
```

- `DurableCallbacks` is today's `Process.Callbacks` verbatim — `onSpawn`, `onInput`,
  `onAlarm`, `onChildEvent`, `rpcHandlers`, all defaulted to no-ops by the combinator.
- `DurableContext` is today's `ProcessContext` with `ctx.process` (the live `Process`)
  replacing `ctx.id` / `ctx.params`, so a handler can hand its own URI to what it spawns.

**Script.** `Script` stops being a separate object joined to an operation record by a
deploy step. Today `deployScript` (`plugin-script/src/util/deploy.ts`) bundles the source,
uploads it to EDGE, and then creates or updates a **second** object — a
`PersistentOperation` whose meta carries the deployed function id and whose `source` field
points back at the script. After, there is one entity: an operation whose handler kind is
`script`.

```ts
// Authored in the app — the definition and its body are one object in the space.
const op = Operation.make({
  meta: { key: DXN.make('org.dxos.operation.user.fetchSales'), name: 'Fetch Sales' },
  input: Schema.Struct({ quarter: Schema.String }),
  output: Schema.Struct({ rows: Schema.Array(Row) }),
}).pipe(Operation.scriptHandler({ source: Ref.make(Text.make({ content: sourceText })) }));

yield * db.addOperation(op);
yield * Operation.deploy(op); // bundles, uploads, stamps the deployed id on the same entity
```

- The handler payload is `{ source: Ref<Text.Text>, changed?: boolean }`; the deployed
  function id and `binding` stay where they already are — the entity's meta and
  `binding` field (`Operation.ts:452`).
- `changed` (source edited since last deploy) moves from `Script.changed` onto the script
  handler, where it describes exactly one thing: this body is ahead of its deployment.
- Invocation needs no new mechanism. "Handler body absent locally ⇒ invoke remotely by
  deployed id" is what `deserialize` already encodes by omission (§3.4); the script kind
  makes it explicit rather than inferred.
- `Script` the type is deleted. Its `source`/`description`/`name` fold into the operation;
  the `source: Ref.Ref(Obj.Unknown)` field on today's record (`Operation.ts:439`) becomes
  the typed `Ref<Text.Text>` on the handler.

**Instructions.** The body is prose plus the tools the agent may use; the runtime runs an
agent turn against the definition's `output` schema and completes when it is satisfied.
The same thing a `Skill` expresses today, addressable as an operation:

```ts
export const TriageIssue = Operation.make({
  meta: { key: DXN.make('org.dxos.operation.issue.triage'), name: 'Triage Issue' },
  input: Schema.Struct({ issue: Ref.Ref(Issue) }),
  output: Schema.Struct({ severity: Severity, assignee: Schema.optional(Ref.Ref(Contact)) }),
  services: [Database.Service],
});

export default TriageIssue.pipe(
  Operation.instructionsHandler({
    instructions: Template.make(`
      Read {{issue}} and any linked discussion. Decide a severity from the rubric in the
      team's triage doc. Suggest an assignee only when one contact clearly owns the area.
    `),
    tools: [SearchOperation, ListContacts],
  }),
);
```

**Prompt.** One model call — a template rendered from the input, its reply parsed into
`output`. No tools, no turn loop:

```ts
export default Summarize.pipe(
  Operation.promptHandler({ prompt: Template.make('Summarize in one sentence:\n\n{{text}}') }),
);
```

Both `instructions` and `prompt` bodies are _data_ (a `Template.Template`), which is what
makes §9.8 — whether they belong in the persisted projection — a real question rather than
a detail: if they do, such an operation can be authored entirely in a space with no code
deployed.

### 5.2 One execution model

Every operation invocation is a process. The kinds differ only in who writes the
lifecycle:

| Handler kind                          | Runtime behavior                                                                                                                                            |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| code / script / prompt / instructions | Wrapped in the **default adapter** — today's `Process.fromOperation` body: idempotency marker, the four trace events, `submitOutput` + `succeed` on return. |
| durable                               | Runs as-is; the adapter's trace events are emitted by the runtime around `onSpawn`/`onInput`.                                                               |

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

Opening the enum (§2) removes the wire hazard the closed version had: an older peer no
longer fails to decode a persisted operation-kind entity, it reads it as an opaque entity
of an unregistered kind (§2.2). Processes never reach a document at all.

## 9. Open questions

1. Kind naming — `operation` / `process` as written, or `definition` / `process`.
2. URI authority for processes: `process://<runtimeId>/<pid>` needs a runtime id stable
   across restart for durable processes; the alternative is `process:///<pid>` with the
   runtime carried in `Environment`.
3. Reaping policy for terminal processes — how long a query still sees a finished process.
4. Whether `rpcs` belongs on `Definition` (and so in its persisted projection) or only on
   the durable handler.
5. Whether `Definition.types` should be narrowed to reject operation- and process-kind
   entities, now that `Type.AnyEntity` spans every registered kind.
6. Whether kind registration is global (a module-scope `registerKind` side effect) or
   scoped to a graph. Global is simpler and matches how types are declared today; scoped
   avoids two runtimes in one process disagreeing about what `operation` means.
7. Whether the plain code handler counts as a fifth handler kind or as the baseline the
   other four are declared against (§5).
8. Whether a prompt template or an instructions body belongs in the persisted projection,
   as a script body already does. If so, those operations are fully defined by data —
   authored in a space, no code deployed.
9. Whether `Operation.deploy` belongs in `@dxos/compute` or stays in the script plugin.
   The script kind is the only one whose body needs a build-and-upload step, and pulling
   it into core drags the bundler and the EDGE functions client with it.
