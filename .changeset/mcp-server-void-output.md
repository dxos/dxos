---
'@dxos/mcp-server': patch
---

`invokeOperation` no longer fails for an operation with a void output. The result used to reach the MCP tool layer as `{ output: undefined }`, which is not valid JSON structured content, so the client got "Tool execution failed due to an internal server error" even though the operation had run. A void output now returns `{}`, and `undefined` values are dropped from any result.
