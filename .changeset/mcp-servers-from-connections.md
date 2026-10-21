---
'@dxos/plugin-assistant': minor
---

GitHub and Linear connections now give the assistant their MCP server's tools, acting as whoever the connection signs in as, and any other MCP server can be added as a Custom MCP Server connection. Each chat can turn a connection's MCP server off, and the agent can add one with the Skill Manager. The Browser and DXOS Introspect servers are now connectors that take no credential.

Breaking:

- `Connection.accessToken` is optional, so code reading it must handle a connection with no credential (`Connection.getAccessToken` asserts one).
- `Skill.mcpServers` is removed: a skill carries instructions and tools, and its servers come from connections.
- The `McpServer` ECHO type (`@dxos/compute/McpServer`) is removed without a migration. Servers stored that way are no longer connected; add them again as Custom MCP Server connections.
