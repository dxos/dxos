---
'@dxos/mcp-server': minor
---

The MCP server projects a fixed three-tool surface — `findOperations`, `invokeOperation` and `skillLoad` — instead of one tool per operation, so a client's context no longer grows with the size of the operation registry. **Breaking:** operations are no longer advertised as MCP tools; a client calls `findOperations` to search them (and to fetch an operation's input schema by key) and `invokeOperation` to run one. `skillLoad` now lists every skill when called with no argument, and per-operation safety hints moved from tool annotations to the `mutation` field of a `findOperations` row.
