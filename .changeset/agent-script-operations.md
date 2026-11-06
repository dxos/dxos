---
'@dxos/echo': minor
---

Script operations: a third operation kind beside durable and non-durable, whose body is a script rather than a compiled handler.

- `Operation.makeScript` / `Operation.isScript` define one; its source is either an inline snippet carrying its own dialect (`plain`, `effect`, `javascript`, `typescript`) or a `Ref` to an ECHO `Script` object. `Operation.serializeScript` / `deserializeScript` round-trip one through the registry record.
- `ScriptRunner` (`@dxos/compute/ScriptRunner`) is the execution seam: a serializable `Request`, a `Result` carrying what the script printed, a `Runner` service and a dialect dispatcher (`byDialect`).
- `ScriptProcess` (`@dxos/compute-runtime`) runs a script as a process, so `runScript` executes it on this runtime or on EDGE by naming a location — the key `org.dxos.script.run` is what an EDGE host resolves.
- Code mode (`@dxos/agent-code-mode`) exposes its dialects and sandboxes as a `Runner`, and the code-mode turn loop, the MCP server's `runScript` and `dx eval` all run through this API.
