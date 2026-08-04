---
'@dxos/compute': minor
---

`McpToolAnnotation` opts an operation into MCP projection: a name, model-facing description, safety class (`read`/`write`/`destructive`), and aspect, applied at the definition site with `Operation.mcpTool({ … })` and read back with `Operation.getMcpTool`. The annotation rides through `Operation.serialize` into the persisted record, so a remote projector (edge mcp-space-service) discovers tools from the operation registry instead of a hand-maintained table. Projected operations must be remotely invocable — refs in, JSON snapshots out, serializable schemas, worker-safe handlers.
