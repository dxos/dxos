---
'@dxos/plugin-assistant': minor
'@dxos/plugin-claude': minor
---

GitHub and Linear connections now give the assistant their MCP server's tools, acting as whoever the connection signs in as, and any other MCP server can be added as a Custom MCP Server connection. Each chat can turn a connection's MCP server off, and the agent can add one with the Skill Manager. The Browser and DXOS Introspect servers are built in: plugins contribute them (`AppCapabilities.McpServer`), they live in the registry rather than a space, and each chat turns them on as its skills need them. A chat in code mode calls its connections' MCP tools from its code, and Claude Code gets the chat's connections too, with each credential kept in Composer.

Breaking:

- `Connection.accessToken` is optional, so code reading it must handle a connection with no credential (`Connection.getAccessToken` asserts one).
- `Skill.mcpServers` is removed: a skill carries instructions and tools, and its servers come from connections.
- An MCP server's tools are offered to the agent as `mcp__<connection>__<tool>` (for example `mcp__weather__get_weather`), as other MCP hosts name them; instructions that name a tool by its bare name should name the prefixed one.
- The `McpServer` ECHO type (`@dxos/compute/McpServer`) is removed without a migration. Servers stored that way are no longer connected; add them again as Custom MCP Server connections.
