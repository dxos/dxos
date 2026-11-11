---
'@dxos/mcp-server': minor
---

An MCP skill token is now derived from the skill's key alone, so every process issues and accepts
the same word with nothing to configure or share. Breaking: `McpServer.skillGate()` takes no
argument and `McpServer.HostShape.skillSecret` is gone — a host that passed a secret drops it. This
fixes a surface served by two processes refusing its own tokens when only one of them held the
secret.
