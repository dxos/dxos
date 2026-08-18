---
'@dxos/cli': patch
---

Add `dx mcp serve --watch`, which reloads the MCP server on change and replays the client's handshake so the session survives the edit. Running from source, every imported source file is watched; in the released binary, the directories of `--dev`-installed plugins are.
