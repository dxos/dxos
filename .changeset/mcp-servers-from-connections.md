---
'@dxos/plugin-assistant': minor
---

GitHub and Linear connections now give the assistant their MCP server's tools, acting as whoever the connection signs in as, and any other MCP server can be added as a Custom MCP Server connection. Each chat can turn a connection's MCP server off. Breaking: `Connection.accessToken` is optional, so code reading it must handle a connection with no credential (`Connection.getAccessToken` asserts one).
