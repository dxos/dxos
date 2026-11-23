---
'@dxos/agent-code-mode': minor
'@dxos/compute': minor
'@dxos/mcp-server': minor
---

Code mode runs the Effect dialect, with its real ECHO bindings, in a Cloudflare Worker Loader isolate, and MCP's `runScript` runs that dialect too.

- `WorkerSandboxWorkerd` is a `WorkerSandbox` spawner for a Worker Loader isolate, as `WorkerSandboxBrowser` is for a Web Worker: a deployment bundles `@dxos/agent-code-mode/workerd-worker-entry` and hands it to `WorkerSandboxWorkerd.spawn`. The isolate's ECHO services are limited to its own space (`WorkerHandle.limit`). `WorkerSandbox.Options` gains `refresh` and `workingSet` for services that, like EDGE's, can neither report nor wait for heads, and its `echo` is passed the space it serves.
- `Operation.hiddenInCodeMode` (`HiddenInCodeModeAnnotation`, read with `isHiddenInCodeMode`) hides an operation from the dialects that hold the database (`Dialect.database`: the Effect dialect, and MCP scripts) while the plain dialect and tool callers still see it; plugin-space and plugin-markdown hide the operations the database API does entirely. `EFFECT_API` exports the Effect dialect's API reference.
- MCP `runScript` scripts are written against the DXOS API (`Database.query(Filter.type(...)).run`, `Obj.update`, `Database.add`, `print`, `DOCS`) on the space `spaceId` names. `yield* Operation.invoke(yield* Database.resolve(key), input)` runs an operation as `invokeOperation` does, through the skill gate with the script's `skillTokens`.

Breaking for `@dxos/mcp-server`: `invoke(key, input?, { spaceId }?)` and runScript's other verbs are gone; an operation's failure fails the program rather than being a `ToolFailure`; `spaceId` is required. `ScriptOptions` takes a code mode `Sandbox` or a `runner` (`Operation.ScriptRunner`) that the request is handed to. `inProcessScriptSandbox`, `isolateScriptSandbox`, `scriptIsolateModule`, `SCRIPT_EFFECT_MODULE`, `scriptRunner`, `scriptDispatch`, `scriptCallOutcome`, `ScriptCall` and `ScriptOutcome` are removed.
