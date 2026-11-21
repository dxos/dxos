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
- Diff-based text writes. `update` and `space.updateObject` both replace a whole string today; that is a separate
  change.
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
- MCP script: `invoke` refuses them with a message that names the binding, and `queryOperations` inside a script
  does not list them. Only on a host that gives scripts a database (section 4): elsewhere the operation is still the
  only way, so it stays.

The `invokeOperation` tool still runs them.

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

MCP's `runScript` description gets the same guidance. The Database skill's own text does not change. It is correct
for a client that calls tools, and code mode's reference overrides it for code.

### 4. Bindings for MCP scripts

`runScript` keeps the Effect dialect. Four verbs join `invoke`, `queryOperations`, `loadSkill` and `print`, each an
effect that fails with the same `ToolFailure`:

- `yield* get(idOrRef)`: the object, or `undefined`.
- `yield* query(typename, props?, options?)`: objects of the type, optionally narrowed by exact property values.
- `yield* search(text, typename?, options?)`: a full-text search, optionally narrowed by type.

Both take the agent's `{ feeds?, in? }`, with `in` naming objects by id or reference.

- `yield* update(idOrRef, patch)`: replaces the patch's fields and returns the object. The write is stored before
  the effect succeeds.

They act on the space the `spaceId` argument names. Data travels in `invoke`'s wire form: objects come out as
snapshots with qualified `{"/": "echo://..."}` envelopes, and an envelope in a patch becomes a reference. So what
`get` returns can go straight into `invoke`, and the other way round.

The verbs are answered host-side, in `scriptDispatch`, next to the other three. Both sandboxes only forward the
verb's name and arguments, so there is no second copy of the workerd facade: no held-object map, no `ref` markers,
no mutator diffing. `update` takes a patch rather than a mutator, because a function cannot cross into the host.

`HostShape` gains an optional `database(spaceId)`. A host without one refuses the verbs with a message that says
so.

- EDGE: compute-service's script host opens one `FunctionContext` for the script's space, on the first verb that
  needs it, and closes it when the script ends.
- CLI (`dx mcp serve`): the space's database from the profile's client.

`runScript` takes `spaceId` from the session's spaces, so the verbs can reach nothing `invoke` could not.

## Testing

- agent-code-mode: unit tests for `get` and `search`; a producer test that annotated operations are absent from
  `ops` and from the prompt; a workerd test for `get` and `search` across the isolate.
- plugin-space: the two operations carry the annotation.
- mcp-server: in-process `runScript` tests for the four verbs; a script's `invoke` refuses an annotated operation
  while the `invokeOperation` tool still runs it.
- edge: a compute-service test where one script reads, updates and reads again against one context. The Discord
  agent tests are recorded again, and assert that no turn calls an annotated operation.
- Model fixtures recorded again where the prompt changed.

## Plan

This dxos PR:

1. This design doc.
2. `ScriptBindingAnnotation` in `@dxos/compute`; plugin-space annotates its two operations.
3. `get` and `search` in the plain dialect and the workerd facade.
4. Code mode leaves annotated operations out; the cost paragraph goes into the API reference.
5. MCP `runScript` verbs, with `HostShape.database`; the CLI host supplies it.
6. Model fixtures recorded again.

The edge PR, after this one publishes:

1. Bump `@dxos/*`.
2. compute-service's script host supplies `database`, opening one `FunctionContext` per script.
3. Discord agent memos recorded again; an end-to-end check on dev.

## Open questions

1. Type discovery (`space-query-types`, `assistant-toolkit-query-types`) was the slowest call in the demo, and no
   binding replaces it. A `types(query?)` binding over the database registry and the published type source would
   be a follow-up.
2. Filing as data. If a type's default collection were a fact the database could read, rather than a rule a
   plugin contributes at runtime, `add` and `remove` could file and unlink, and `space.addObject` and
   `space.removeObjects` could be annotated too.
