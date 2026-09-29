---
'@dxos/mcp-server': minor
---

The MCP server now brands itself with the full-colour Composer mark instead of the monochrome DXOS mark, and also serves it as `/favicon.ico`, because some clients (claude.ai among them) show a connector's domain favicon rather than `serverInfo.icons`.

Breaking: `ICON_LIGHT_PATH` and `ICON_DARK_PATH` are replaced by `ICON_PATH` (`/icon.png`) and `FAVICON_PATH` (`/favicon.ico`). `icons()` now returns a single theme-independent entry.
