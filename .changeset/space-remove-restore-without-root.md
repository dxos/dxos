---
'@dxos/plugin-space': patch
---

`space.removeObjects` now works in a space with no root collection, and `space.restoreObjects` accepts `refs`, so a caller outside the process (MCP, EDGE) can restore what it removed.
