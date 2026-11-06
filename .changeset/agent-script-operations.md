---
'@dxos/echo': minor
---

Script operations: a third operation kind beside durable and non-durable, whose body is a script rather than a compiled handler.

- `Operation.makeScript` defines one, and it **is** an `Operation.Definition`, so a client just invokes it: `Operation.invoke(script, input, { on: 'local' | 'edge' })`. Its source is either an inline snippet carrying its own dialect (`plain`, `effect`, `javascript`, `typescript`) or a `Ref` to an ECHO `Script` object; its default output is `Operation.ScriptResult` — what the script printed. `serializeScript`/`deserializeScript` round-trip one through the registry record.
- The runtime runs it natively: `ProcessManager.runScript` makes the run a process in the manager's own tree, under the operation's key, so a script has a pid, a parent, its own permissions and storage, and can invoke operations and spawn children like a handler does.
- `ScriptRunner.Service` is the runtime's script backend — a layer the process manager depends on, never something a caller names. `ScriptRunner.byDialect` composes several. The runtime hands a backend the script's own process (`Operation.ScriptRuntime`), which is what makes the script's calls and children belong to that process.
- Code mode (`@dxos/agent-code-mode`) exposes its dialects and sandboxes as a backend, and the code-mode turn loop, the MCP server's `runScript` and `dx eval` all run through this API.
