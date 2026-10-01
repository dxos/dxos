---
'@dxos/echo': minor
---

The MCP server can serve a `runScript` tool: an agent writes one JavaScript script that calls
`invoke`, `queryOperations` and `loadSkill` — through the same skill gate and space rules as the
tools — instead of one `invokeOperation` round trip per object. A host opts in with the `script`
option of `McpServer.layer`/`toolsLayer`, and `dx mcp serve --code-mode` turns it on locally.
