---
'@dxos/echo': minor
---

Script operations: a third operation kind beside durable and non-durable, whose body is a script rather than a compiled handler.

- `Operation.makeScript` / `Operation.isScript` define one; its source is either an inline snippet carrying its own dialect (`plain`, `effect`, `javascript`, `typescript`) or a `Ref` to an ECHO `Script` object. `Operation.serializeScript` / `deserializeScript` round-trip one through the registry record.
- `ScriptRunner` (`@dxos/compute/ScriptRunner`) is the execution seam: a serializable `Request`, a `Result` carrying what the script printed, a `Runner` service and a dialect dispatcher (`byDialect`).
- The process manager runs a script operation directly: `OperationProcess.makeScript` is the script kind's counterpart to the wrapper that runs a compiled operation, so a run is a process under the operation's own key, and `invokeScript` on the process invoker takes it local or to EDGE. There is no script process of its own.
- Code mode (`@dxos/agent-code-mode`) exposes its dialects and sandboxes as a `Runner`, and the code-mode turn loop, the MCP server's `runScript` and `dx eval` all run through this API.
