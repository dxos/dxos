---
'@dxos/echo': minor
---

MCP servers added from the assistant's chat options are now connected on every agent turn, locally and on EDGE; they previously never reached the agent. Servers that need auth take an API key (stored as an `AccessToken`) or an OAuth sign-in (MCP authorization with dynamic client registration and PKCE, via the new `@dxos/mcp-client` `McpOAuth`), the options panel shows each server's connection status with a Sign in action, and MCP connections are closed after each turn instead of accumulating until a browser stalls. Breaking: the `McpServer` ECHO type moved from `@dxos/assistant-toolkit` to `@dxos/compute/McpServer` (the embedded spec struct is now `McpServer.Spec`), `McpToolkit.make` requires a `Scope` and closes its client with it, `AiSession` takes `mcpServers` as `McpToolkit.Options[]`, and `AgentService.layer`'s unused `getMcpServers` option is removed.
