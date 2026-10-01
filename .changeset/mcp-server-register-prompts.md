---
'@dxos/mcp-server': minor
---

Add `registerPrompts(registry)`, which adds the opted-in skill prompts to an MCP server that is already running, so a host can answer `server/discover`, `initialize` and `tools/list` without loading skills and register them when the first prompt request arrives. `promptsLayer` is now built on it.
