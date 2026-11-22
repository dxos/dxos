# Direct bindings in code mode

Code mode should read and change objects through bindings, not through operations. This holds for the agent's
`eval` and for MCP's `runScript`, and the model must know why.

## Problem

Code mode gives a model two ways to touch objects:

- **Bindings:** `query`, `make`, `add`, `update`, `remove`, `flush`. They run against a database that the
  evaluation already has open.
- **Operations:** `ops[...]` in the agent's `eval`, `invoke(...)` in an MCP script.

On EDGE an operation costs much more than a binding:

| Step           | Binding                                                                           | Operation                                                                                                                                                                            |
| -------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Transport      | Isolate to host, over Workers RPC.                                                | Isolate to host, then OperationProcess, then an RPC to operation-service (edge `compute-service/src/processes/operation-service-handler-set.ts:48`).                                 |
| Database       | The process's own, opened once per Durable Object (edge `process-object.ts:653`). | A new client, space and Automerge repo for every call (edge `operation-service/src/entrypoint.ts:283`; the comment at `:478` says so).                                               |
| Plugin routing | None.                                                                             | With `OPERATION_ROUTING=plugins` the bundle opens one more context per call; a cold isolate first loads the bundle from R2 (edge `compute-service/src/plugins/plugin-router.ts:62`). |
| Result         | A snapshot of the live object.                                                    | A JSON snapshot.                                                                                                                                                                     |

Measured costs:

- Production, 2026-11-13: `space.addObject` took 5–6 s per call through its bundle.
- Preview, 2026-11-19: `space-query-types` took 19.6 s on a cold bundle and returned nothing.
- Local test stack: each `agent.*` operation took 55–300 ms.

A binding is not free either. `query` is one `execQuery` call to db-service, which first runs `Indexer.catchUp`.
An operation that queries pays the same catch-up, and everything in the table on top.

The model still picks operations. In the 2026-11-19 Kai demo, all 15 `eval` calls used `ops[...]`:
`space-query-types` ×3, `assistant-toolkit-query-types` ×2, `space-add-object` ×2, `space-get-objects` ×2,
`space-update-object` ×2, `space-get-object-link`, and Discord sends. Three causes:

1. The Database skill (`plugin-space/src/skills/DatabaseSkill.ts`) tells the model to read with
   `space-get-objects`, change with `space-update-object`, and so on. Code mode lists those tools under `ops`,
   and the model follows the skill.
2. The plain dialect's API reference (`src/dialect-plain.ts`) says nothing about cost. The Effect dialect does
   (`src/docs/operations.md`, "When not to use one").
3. The facade has gaps that only an operation fills. Nothing reads an object by id or reference (`query` needs a
   typename), and nothing searches text.

MCP scripts are worse off, because `runScript` has no bindings at all. Its scope is `invoke`, `queryOperations`,
`loadSkill` and `print` (`mcp-server/src/McpServer.ts`, `RunScript`). On EDGE, compute-service gives the script a
host whose only method is `invoke`, and each `invoke` goes to operation-service (edge
`compute-service/src/entrypoint/compute-service.ts:56`). A script that reads 10 objects and updates 5 opens 15
contexts.

## Goals

1. Agent and MCP scripts read and change objects through bindings, against one database: opened once per process
   for the agent, once per script for MCP.
2. Code mode does not offer an operation that a binding fully replaces, so the model cannot take the slow path.
3. The API reference tells the model that bindings are local and operations are remote, and maps the Database
   skill's verbs to the bindings.

## Non-goals

- Making EDGE operations cheaper, for example by reusing the caller's context in operation-service. That helps
  every caller but is a larger change, and this design does not block it.
- Creating and deleting objects through bindings. `space.addObject` files a new object into its default
  collection, using rules that plugins contribute through the capability manager, and `space.removeObjects`
  unlinks an object from the root collection and closes its open panels. `add` and `remove` do neither, and an
  agent on EDGE has no capability manager to ask for the rules. Both operations stay; see open question 2.
- MCP's `invokeOperation` tool. A client without code mode still needs every operation, so the tool keeps them.

## Design

### 1. Close the facade gaps

Add two bindings to the plain dialect and to the workerd facade (`FACADE` in `src/WorkerdSandbox.ts`,
`src/workerd/prelude.mjs`):

- `await get(idOrRef)`: the stored object, or `undefined`. It replaces `space-get-objects`.
- `await search(text, typename?, options?)`: a full-text search (`Filter.text`), optionally narrowed by type.

`query` and `search` take `{ feeds?, in? }`, which `space.queryObjects` takes as `includeQueues` and `in`: `feeds`
also matches what feeds hold (mail, calendar events), and `in` keeps only objects under the given ones (a feed, a
collection). A typename also matches every copy of the type stored in the space by `space.addType`, since objects of a
stored type carry its `echo:` id, which the bare typename does not match. Both are what `space.queryObjects` does.

### 2. Mark the replaced operations

Add an operation annotation, next to `IdempotentAnnotation` in `@dxos/compute/Operation`:

```ts
export const ScriptBindingAnnotation = Annotation.make({
  id: 'org.dxos.operation.script-binding',
  schema: Schema.Array(Schema.String),
});
```

Its value names the bindings that replace the operation. plugin-space annotates three operations:

| Operation            | Replaced by       |
| -------------------- | ----------------- |
| `space.getObjects`   | `get`             |
| `space.updateObject` | `update`          |
| `space.queryObjects` | `query`, `search` |

Code mode leaves annotated operations out:

- Agent: out of `ops` and out of the operations section of the system prompt, in both dialects.
- MCP script: out of `ops` (section 4).

`ops` answers a name it does not bind with an error that names the bindings. The `invokeOperation` tool still runs
the annotated operations.

The annotation reaches EDGE without a key list. `Operation.serialize` writes `meta.annotations` into the record,
`Operation.deserialize` restores it, and operation-service's `listOperations` returns those records to
compute-service.

`space.addObject` and `space.removeObjects` stay (see Non-goals), and so do `space.addRelation`, `space.addType`,
`space.queryTypes`, `space.getObjectLink`, `space.resolveUrl` and the tag operations, which no binding does.

### 3. Tell the model

The plain dialect's API reference gets one paragraph ahead of the operations section:

> These bindings run against a database this evaluation already has open, so each call is a local read or write.
> An `ops` call is a remote invocation that opens its own database, and can take seconds. Read and change objects
> with the bindings, even where a skill names a tool for it: read with `get`, `query` or `search`, and change with
> `update`. One case still takes an operation, when it is listed: creating or deleting an object the user should
> find in a collection, which the space operations that add and remove objects file into its collection, or unlink.

The Database skill's text still tells the model to read with `space-get-objects`. So `ops` answers a name it does not
bind with an error that names the bindings, instead of the bare "is not a function".

MCP's `runScript` description carries the same API reference, read from the plain dialect, with this paragraph. The
Database skill's own text does not change. It is correct for a client that calls tools, and code mode's reference
overrides it for code.

A string assigned over a string in `update` is written as a diff (`Text.update`), as `markdown.update` writes it, so
replacing a document's text keeps cursors and merges with concurrent edits.

### 4. MCP scripts run the Effect dialect

`runScript` runs code mode's Effect dialect, through code mode's runner: the `Operation.ScriptRunner` that
`@dxos/compute` defines for scripts (`Operation.inlineScript(code, { dialect: 'effect' })`). A script is written
against the DXOS API itself, as the agent's `eval` is in Composer, and the tool's description embeds the dialect's
own reference (`EFFECT_API`).

What a script gets, against the space the `spaceId` argument names:

- The dialect's names: `Database`, `Filter`, `Query`, `Order`, `Obj`, `Relation`, `Ref`, `Type`, `DXN`,
  `Operation`, `Effect`, `print` and `DOCS`, with live objects from the space's database.
- Every operation an opted-in skill names, except those the API replaces, as a stand-in definition that
  `Database.resolve(key)` answers. `Operation.invoke` runs it exactly as `invokeOperation` does: the same input codec,
  skill gate and space rules. The gate takes the `skillTokens` argument; a call whose skill is not loaded fails the
  program, saying first where the token goes, since code mode cuts a long failure line.

A script has no `loadSkill` or `queryOperations`: the client calls those tools before it writes the script.

How it runs:

- `ScriptOptions.sandbox` is a code mode `Sandbox`: `Sandbox.inProcess` for `dx mcp serve --code-mode`, and on EDGE
  `WorkerdEchoSandbox` (below).
- A host that runs no code names a `runner` instead, an `Operation.ScriptRunner` in another runtime, and `runScript`
  hands it the Effect-dialect request. EDGE's MCP router does this: its runner sends the request to compute-service,
  which answers it with `runScript` and `WorkerdEchoSandbox`.
- The runner's database is the host's `database(spaceId)`: on EDGE one `FunctionContext` over the caller's working
  set, opened for the script and closed when it ends; on the CLI the space the profile's client holds open.

This changes `runScript`'s contract: its own `invoke` verb is gone, and an operation's failure fails the program
rather than being a `ToolFailure` to recover.

### 5. The Effect dialect on workerd

The Effect dialect hands code live ECHO objects and the `@dxos/echo` modules, so the code must run where a database
is. Workers do not compile code from a string (`new Function`, `eval`), so EDGE runs it in a Worker Loader isolate,
and `WorkerdSandbox`'s isolate holds no database: it only forwards plain-dialect calls home.

`WorkerdEchoSandbox` puts the database in the isolate. It is `WorkerSandbox`, which Composer runs in a Web Worker,
with the thread swapped for an isolate:

1. The isolate runs code mode's worker runtime (`WorkerdEchoRuntime`): its own `EchoClient`, connected to the host's
   ECHO services, and the dialect's real bindings.
2. The worker protocol's `MessagePort` is replaced by `WorkerdBridge`: two functions passed over Workers RPC, one per
   direction, each sending batches with one call in flight so messages stay in order.
3. The model's code is compiled into the program module the sandbox writes for each evaluation, a fresh isolate
   each time, since there is no `eval`. `SandboxInit.names` carries the names it destructures.
4. The isolate has no network (`globalOutbound: null`) and no bindings. The host's ECHO services serve any space,
   and code holding live objects can reach its own client, so the sandbox serves the isolate only its evaluation's
   space and the calls a client of one database makes; reindexing, statistics and garbage collection are refused.
5. EDGE's data service writes through to db-service and pushes no client's writes to another, and it can neither
   report nor wait for heads. With `WorkerSandbox.Options.refresh`, each side flushes and the host refreshes its
   documents (on EDGE, the script container's `refreshWorkingSet`), in place of the heads handover.
6. The isolate's database opens over the caller's working set (`WorkerSandbox.Options.workingSet`, served over the
   same channel), so a script reads the writes of the calls before it that the index does not hold yet. It saves the
   working set when it flushes and takes it again after each operation, as compute-service's own script database
   does around a call.
7. The host's registered types are sent with the evaluation. A type the host resolves only on demand (on EDGE, every
   published type) comes from a type source the isolate registers, which asks the host. `Database.resolve` of a type
   DXN asks the database's type sources first, since its own lookup does not.
8. With the flush handover, the worker closes its client once it has flushed and before it reports, so the host's
   final refresh never waits on a subscriber that has gone. Every refresh is bounded as a heads catch-up is.

A deployment bundles `@dxos/agent-code-mode/workerd-echo-runtime` for workerd, with the Automerge wasm it imports, and
hands the modules to the sandbox. EDGE builds it with its own worker bundler, which carries the workerd workarounds
ECHO needs.

The cost is per evaluation: workerd compiles the runtime (about 2 MB of JavaScript and 3.5 MB of wasm) into a fresh
isolate, and the client loads each document the code touches from the host. The agent on EDGE keeps the plain
dialect until that cost is measured against its turns.

## Testing

- agent-code-mode: unit tests for `get` and `search`; a producer test that annotated operations are absent from
  `ops` and from the prompt; a workerd test for `get` and `search` across the isolate; `WorkerdEchoSandbox` run
  in-process through its program module and bridge, against a real database (Effect code, `Operation.invoke`, a
  program that does not compile, a query naming another space).
- plugin-space: the two operations carry the annotation.
- mcp-server: `runScript` tests on a real database for the Effect dialect and `Operation.invoke` (skill gate,
  tokens); an annotated operation does not resolve while the `invokeOperation` tool still runs it.
- edge: mcp-space-service and mcp-router scripts in the Effect dialect, run in a real Worker Loader isolate through
  `WorkerdEchoSandbox`; one script reads and updates, a second reads the change back.
- Model fixtures recorded again where the prompt changed; extracting `EFFECT_API` leaves the prompt byte-identical.

## Plan

This dxos PR:

1. This design doc.
2. `ScriptBindingAnnotation` in `@dxos/compute`; plugin-space annotates its two operations.
3. `get` and `search` in the plain dialect and the workerd facade.
4. Code mode leaves annotated operations out; the cost paragraph goes into the API reference.
5. `WorkerdEchoSandbox` and its runtime entry; `WorkerSandbox` takes the space and a `refresh` handover.
6. MCP `runScript` runs the Effect dialect through code mode's runner, with `HostShape.database`; the CLI host
   supplies it.
7. Model fixtures recorded again.

The edge PR, after this one publishes:

1. Bump `@dxos/*`.
2. compute-service bundles the workerd runtime and runs `runScript` in `WorkerdEchoSandbox`, serving the script
   container's ECHO services and refreshing them as the handover.
3. Discord agent memos recorded again; an end-to-end check on dev.

## Open questions

1. Type discovery (`space-query-types`, `assistant-toolkit-query-types`) was the slowest call in the demo, and no
   binding replaces it. A `types(query?)` binding over the database registry and the published type source would
   be a follow-up.
2. Filing as data. If a type's default collection were a fact the database could read, rather than a rule a
   plugin contributes at runtime, `add` and `remove` could file and unlink, and `space.addObject` and
   `space.removeObjects` could be annotated too.
