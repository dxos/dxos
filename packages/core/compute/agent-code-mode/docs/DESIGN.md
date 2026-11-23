# Code mode on EDGE: the DXOS API in an ECHO isolate

Code mode on EDGE should read and change objects through the database, not through operations, in the agent's `eval`
and in MCP's `runScript`, and both should write the same DXOS API Composer's agent does.

## Problem

On EDGE every operation opens a new client, space and Automerge repo in operation-service: `space.addObject` took
5–6 s per call on production (2026-11-13). In the 2026-11-19 Kai demo all 15 `eval` calls used operations
(`space-get-objects`, `space-update-object`, `space-query-types` and the like), because the Database skill names them.

The agent on EDGE ran the plain dialect in `WorkerdSandbox`, a Worker Loader isolate with no database, whose bindings
forward each call home; MCP scripts ran a dialect of their own whose only way to the space was `invoke`. Composer's
agent writes the Effect dialect — `Database.query(...)`, `Obj.update`, `Operation.invoke` — against its own ECHO
client in a Web Worker (`WorkerSandbox`).

## Design

### 1. Hide the operations the database API replaces

`Operation.hiddenInCodeMode` (`HiddenInCodeModeAnnotation`) hides an operation from code mode: the model's operations
leave it out (both dialects), and an MCP script cannot resolve it. The `invokeOperation` tool still runs it for clients
that do not write code. plugin-space hides `space.getObjects`, `space.updateObject` and `space.queryObjects`, and
plugin-markdown `markdown.open`, because the database API does each of them entirely. The annotation travels in the
serialized operation record, so EDGE's hosted toolkit sees it with no key list.

`space.addObject` and `space.removeObjects` stay: they file and unlink objects using rules plugins contribute at
runtime, which the database does not hold.

### 2. Run `WorkerSandbox` in a Worker Loader isolate

`WorkerSandboxWorkerd` is a `WorkerSandbox` spawner, as `WorkerSandboxBrowser` is for a Web Worker. The isolate runs
`WorkerSandboxWorkerdEntry`, code mode's worker runtime: its own `EchoClient` over the host's ECHO services, and the
dialect's real bindings. Three things differ from a thread:

1. An isolate cannot be handed a `MessagePort`. `WorkerdBridge` carries the worker protocol over two Workers RPC
   functions, one per direction, each sending batches with one call in flight so messages stay in order.
2. Workerd has no `eval`. The spawner writes a program module per evaluation, a fresh isolate each time, with the
   model's code as the body of a function over the dialect's names (`SandboxInit.names`).
3. The isolate is a security boundary: no network (`globalOutbound: null`), no bindings. The host's services serve any
   space, and code holding live objects can reach its own client, so the spawner's handle limits them
   (`WorkerHandle.limit`) to the evaluation's space and the calls one database makes.

EDGE's data service writes through to db-service, pushes no client's writes to another, and can neither report nor
wait for heads. So `WorkerSandbox` takes three host hooks:

- `refresh`: each side flushes and the host re-reads its documents, in place of the heads handover. The worker closes
  its client before it reports, so the final refresh never waits on it; every refresh is bounded.
- `workingSet`: the worker's database opens over the host's working set, so it reads writes the index does not hold
  yet; it saves the working set when it flushes and takes it again after each operation.
- Types: the worker registers a type source that asks the host (`Sandbox.resolveType`), so EDGE's published types
  resolve. `Database.resolve` of a type DXN asks the type sources first, since its own lookup does not.

A deployment bundles `@dxos/agent-code-mode/workerd-worker-entry` for workerd with the Automerge wasm it imports; EDGE
builds it with its own worker bundler. Each evaluation pays for loading that runtime (about 2 MB of JavaScript and
3.5 MB of wasm) and for each document the code touches.

### 3. MCP scripts run the Effect dialect

`runScript` runs code mode's Effect dialect through code mode's runner, the `Operation.ScriptRunner` scripts run
through (`Operation.inlineScript(code, { dialect: 'effect' })`). The tool description embeds the dialect's reference
(`EFFECT_API`, shared with the agent's prompt). Each operation an opted-in skill names is a stand-in
definition that `Database.resolve(key)` answers; `Operation.invoke` runs it as `invokeOperation` does, through the
skill gate with the script's `skillTokens`.

`ScriptOptions` takes a code mode `Sandbox` (`Sandbox.inProcess` for `dx mcp serve --code-mode`), or a `runner` the
request is handed to: EDGE's MCP router hands it to compute-service, which runs it with `WorkerSandboxWorkerd`.

## Testing

- agent-code-mode: the producer leaves a marked operation out of the prompt; `WorkerSandboxWorkerd` runs in-process
  through its program module and bridge against a real database (Effect code, `Operation.invoke`, the working set, a
  type from a type source, code that does not compile, a query naming another space).
- mcp-server: `runScript` on a real database (the DXOS API, `Operation.invoke` through the skill gate, a marked
  operation that does not resolve while the tool still runs it).
- edge: MCP scripts and the agent's `eval` in a real Worker Loader isolate; the agent suites recorded again.

## Open questions

1. Filing as data. If a type's default collection were a fact the database could read, `space.addObject` and
   `space.removeObjects` could be marked too.
2. Cold start. Each evaluation compiles the runtime into a fresh isolate; a warm isolate per process would need the
   program delivered without a module, which workerd does not allow today.
