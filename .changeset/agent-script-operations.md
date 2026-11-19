---
'@dxos/echo': minor
---

Script operations: a third kind of operation, beside durable and non-durable, whose body is a script instead of a compiled handler.

- **Defining and invoking.** `Operation.makeScript` creates one, and it is an `Operation.Definition`, so a client invokes it like any other operation: `Operation.invoke(script, input, { on: 'local' | 'edge' })`. Its source is either an inline snippet, `Operation.inlineScript(code, { dialect })` with a dialect of `plain`, `effect`, `javascript` or `typescript`, or a `Ref` to an ECHO `Script` object. Its default output is `Operation.ScriptResult`, which holds what the script printed and its error if it failed.
- **Running.** The runtime runs a script operation itself. `Process.Manager.spawn` accepts a script operation as well as a durable one, and the process manager runs the script's code through its script backend. The run is a process in the same tree, under the operation's key, with a pid, a parent, its own permissions and storage, and children of its own. On EDGE, the script operation is invoked by its key like any remote operation.
- **Backend.** `@dxos/compute-runtime/script-runner` is the runtime's side. It provides the backend `Service` (a layer the process manager depends on, not something a caller uses directly), `byDialect` to combine several backends, the source and request schemas, source resolution, and a script operation's registry-record form (`serialize` / `deserialize`). The runtime gives a backend the script's own process (`Operation.ScriptRuntime`), so the operations a script invokes and the processes it spawns become children of the script.
- **Consumers.** Code mode (`@dxos/agent-code-mode`) provides its dialects and sandboxes as a backend (`Runner.make`). The code-mode turn loop, the MCP server's `runScript` and `dx eval` all run through this API.

Breaking for implementers of `Process.Manager`: `spawn` now accepts `Operation.Durable | Operation.ScriptDefinition`. A custom manager that only forwards `spawn` needs no change. A manager that runs a definition itself must handle the script kind or reject it.
