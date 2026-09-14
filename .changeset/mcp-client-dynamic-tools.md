---
'@dxos/mcp-client': patch
---

MCP tools with parameters no longer crash the assistant's turn: each tool is now built as a dynamic tool carrying the server's own JSON Schema, which is what the provider is shown and what a tool call is validated against.
