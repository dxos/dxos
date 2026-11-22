---
'@dxos/mcp-server': minor
---

The MCP `runScript` tool runs code mode's Effect dialect through code mode's runner, so a script is written against the DXOS API itself (`Database.query(Filter.type(...)).run`, `Obj.update`, `Database.add`, `print`, `DOCS`) on the space `spaceId` names, as the agent's `eval` is in Composer. `yield* Operation.invoke(yield* Database.resolve(key), input)` runs an operation as `invokeOperation` does, through the skill gate with the script's `skillTokens`. Operations the API replaces do not resolve.

Breaking: `invoke(key, input?, { spaceId }?)` and runScript's other verbs are gone; an operation's failure fails the program rather than being a `ToolFailure` to recover with `Effect.result`; `spaceId` is required. `ScriptOptions` takes a code mode `Sandbox` (`Sandbox.inProcess`, `WorkerdEchoSandbox`), with the host giving scripts a `database`, or a `runner` (`Operation.ScriptRunner`) that the request is handed to. `inProcessScriptSandbox`, `isolateScriptSandbox`, `scriptIsolateModule`, `SCRIPT_EFFECT_MODULE`, `scriptRunner`, `scriptDispatch`, `scriptCallOutcome`, `ScriptCall` and `ScriptOutcome` are removed. `McpServer.host` gives scripts the ambient `Database.Service` when there is one.
