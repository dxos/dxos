---
'@dxos/mcp-server': minor
---

The MCP `runScript` tool runs code mode's plain dialect through code mode's runner, so an MCP script and the agent's `eval` are one language over one set of bindings: `get`, `query`, `search`, `update`, `make`, `add`, `remove`, `ref`, `describe` and the rest act on the space `spaceId` names, and `await ops[key](input)` runs an operation as `invokeOperation` does. Operations a binding replaces are not in `ops`.

Breaking: a script is the body of an async function, not of an `Effect.gen`, and `spaceId` is required. `ScriptOptions` takes a code mode `Sandbox` (`Sandbox.inProcess`, `WorkerdSandbox`), with the host giving scripts a `database`, or a `runner` (`Operation.ScriptRunner`) that the request is handed to. `inProcessScriptSandbox`, `isolateScriptSandbox`, `scriptIsolateModule`, `SCRIPT_EFFECT_MODULE`, `scriptRunner`, `scriptDispatch`, `scriptCallOutcome`, `ScriptCall` and `ScriptOutcome` are removed. `McpServer.host` gives scripts the ambient `Database.Service` when there is one.
