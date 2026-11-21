# Direct bindings in code mode

Code mode should read and write objects through bindings, not through operations. This holds for the agent's
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
   `space-get-objects`, create with `space-add-object`, and so on. Code mode lists those tools under `ops`, and the
   model follows the skill.
2. The plain dialect's API reference (`src/dialect-plain.ts`) says nothing about cost. The Effect dialect does
   (`src/docs/operations.md`, "When not to use one").
3. The facade has gaps that only an operation fills. Nothing reads an object by id or reference (`query` needs a
   typename), and nothing searches text.

MCP scripts are worse off, because `runScript` has no bindings at all. Its scope is `invoke`, `queryOperations`,
`loadSkill` and `print` (`mcp-server/src/McpServer.ts:614`). On EDGE, compute-service gives the script a host whose
only method is `invoke`, and each `invoke` goes to operation-service (edge
`compute-service/src/entrypoint/compute-service.ts:56`). A script that reads 10 objects and updates 5 opens 15
contexts.

## Goals

1. Agent and MCP scripts read and write objects through bindings, against one database: opened once per process
   for the agent, once per script for MCP.
2. Code mode does not offer an operation that a binding covers, so the model cannot take the slow path.
3. The API reference tells the model that bindings are local and operations are remote. It maps the Database
   skill's verbs to the bindings.

## Non-goals

- Making EDGE operations cheaper, for example by reusing the caller's context in operation-service. That helps
  every caller but is a larger change, and this design does not block it.
- Diff-based text writes. `update` and `space.updateObject` both replace a whole string today; that is a separate
  change.
- MCP's `invokeOperation` tool. A client without code mode still needs the CRUD operations, so the tool keeps them.
- Composer's Effect dialect. It already has the whole ECHO API in scope.

## Design

### 1. Close the facade gaps

Add two bindings to the plain dialect and to the workerd facade (`FACADE` in `src/WorkerdSandbox.ts`,
`src/workerd/prelude.mjs`):

- `await get(idOrRef)`: the stored object, or `undefined`. It replaces `space-get-objects`.
- `await search(text, typename?)`: a full-text search (`Filter.text`), optionally narrowed by type. It replaces the
  text form of `space-query-objects`.

### 2. Mark the covered operations

Add an operation annotation, next to `IdempotentAnnotation` and `ConsentPreviewAnnotation` in
`@dxos/compute/Operation`:

```ts
export const ScriptBindingAnnotation = Annotation.make({
  id: 'org.dxos.operation.script-binding',
  schema: Schema.String,
});
```

Its value names the binding that replaces the operation. plugin-space annotates four operations:

| Operation             | Replaced by    |
| --------------------- | -------------- |
| `space.getObjects`    | `get`          |
| `space.addObject`     | `make` + `add` |
| `space.updateObject`  | `update`       |
| `space.removeObjects` | `remove`       |

Code mode leaves annotated operations out:

- Agent: out of `ops` and out of the operations section of the system prompt.
- MCP script: `invoke` refuses them with a message that names the binding, and `queryOperations` inside a script
  does not list them.

The `invokeOperation` tool still runs them.

The annotation reaches EDGE without a key list. `Operation.serialize` writes `meta.annotations` into the record,
and operation-service's `listOperations` returns those records to compute-service.

No binding covers `space.addRelation`, `space.addType`, `space.queryTypes`, `space.getObjectLink`,
`space.resolveUrl` or the tag operations, so they stay. `space.queryObjects` also stays for now (open question 2).

### 3. Tell the model

The plain dialect's API reference gets one paragraph ahead of the operations section:

> The bindings above run against a database this evaluation already has open: each call is a local read or
> write. An `ops` call is a remote invocation that opens its own database, and can take seconds. Read and write
> objects with the bindings. Where a skill names a tool to read, create, update or remove objects, use the binding:
> read with `get` or `query`, create with `make` then `add`, change with `update`, delete with `remove`.

The same paragraph goes into MCP's `runScript` description. Filing an object into a collection, which
`space.addObject` did with `target`, becomes `update(collection, (c) => { c.objects.push(ref(obj)); })`;
`src/docs/database.md` shows it.

The Database skill's own text does not change. It is correct for a client that calls tools, and code mode's
reference overrides it for code.

### 4. Bindings for MCP scripts

**Recommended (A): `runScript` uses the plain dialect and code mode's sandboxes.**

- `code` becomes the body of an async function, as in the agent's `eval`.
- The scope is the same facade (`query`, `get`, `search`, `make`, `add`, `update`, `remove`, `flush`, `ref`,
  `relations`, `children`, `referrers`, `describe`, `print`), plus MCP's own verbs as async functions:
  `invoke(key, input, { spaceId })`, `queryOperations(...)` and `loadSkill(name)`. `invoke` keeps the skill gate
  and the space rules.
- `HostShape` gains an optional `database(spaceId)`. mcp-server builds the bindings from it, so the host only
  supplies a database and a sandbox.
- EDGE: compute-service runs the script with `WorkerdSandbox` in place of `isolateScriptSandbox`. Its `database`
  opens a `FunctionContext` for the script's space once, through its own service bindings as `ProcessObject` does.
  It refuses a space that is not in `request.spaceIds`, the rule `invoke` applies today. A script that names no
  space gets no database, and the bindings fail with a message that says so.
- CLI (`dx mcp serve`): the in-process sandbox runs the same dialect against the profile's client.
- mcp-server's Effect isolate module (`src/internal/script*.ts`) goes away.

The cost of A is a changed `runScript` contract. Clients read the tool description in each session, so no client
code breaks, but recorded MCP conversations must be recorded again.

**Alternative (B): keep the Effect dialect and add the database verbs as effects** (`yield* query(...)`). The
contract stays, but mcp-server needs a second isolate facade that repeats `prelude.mjs`: snapshots, `ref` markers,
mutator diffing. Two facades with the same verbs drift apart.

## Testing

- agent-code-mode: unit tests for `get` and `search`; a producer test that annotated operations are absent from
  `ops` and from the prompt; a workerd test for `get` and `search` across the isolate.
- plugin-space: the four operations carry the annotation.
- mcp-server: in-process `runScript` tests in the plain dialect; a script's `invoke` refuses an annotated operation
  while the `invokeOperation` tool still runs it.
- edge: a compute-service workerd test where one script queries, updates and flushes against one context, and is
  refused for a space outside `spaceIds`. The Discord agent tests are recorded again, and assert that no turn
  calls an annotated operation.
- Model fixtures recorded again: plugin-assistant, assistant-e2e, and edge's discord-agent memos.

## Plan

This dxos PR:

1. This design doc.
2. `ScriptBindingAnnotation` in `@dxos/compute`; plugin-space annotates its four operations.
3. `get` and `search` in the plain dialect and the workerd facade.
4. Code mode leaves annotated operations out; the cost paragraph goes into the API reference.
5. MCP `runScript` on the plain dialect, with `HostShape.database`.
6. Model fixtures recorded again.

The edge PR, after this one publishes:

1. Bump `@dxos/*`.
2. compute-service `runScript` on `WorkerdSandbox`, with a `database` that opens one `FunctionContext`.
3. Discord agent memos recorded again; an end-to-end check on dev.

## Open questions

1. MCP dialect: A (plain, recommended) or B (Effect plus verbs)?
2. Should `space.queryObjects` be annotated too? Its queue scope (`includeQueues`, `in`) has no binding.
   Recommended: leave it visible, and say in the reference that `query` and `search` are for objects in the space.
3. Type discovery (`space-query-types`, `assistant-toolkit-query-types`) was the slowest call in the demo, and no
   binding replaces it. A `types(query?)` binding over the database registry and the published type source would
   be a follow-up.
