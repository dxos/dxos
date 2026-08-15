---
'@dxos/cli': patch
---

Add `dx mcp serve --watch`, which reloads the MCP server on source change and replays the client's handshake so the session survives the edit. Available when running the CLI from source; the released binary has no sources to watch and omits the flag.
