---
'@dxos/mcp-server': minor
---

`McpServer.WhoAmI` (with `WhoAmIToolkit`, `WhoAmIResult`, `SpaceInfo` and `describeSpace`) defines the `whoami` tool once for every host; Composer's in-app MCP server now answers it with the app's identity and the chat's space, so the project skill can confirm its space there as it does over `dx mcp serve` and EDGE.
