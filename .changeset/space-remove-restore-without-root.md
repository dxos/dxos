---
'@dxos/deus': patch
---

`space.removeObjects` now works in a space with no root collection, and `space.restoreObjects` accepts `refs`, so a caller outside the process (MCP, EDGE) can restore what it removed. `deus changelog check` accepts a branch that repairs a decision id its base holds twice, by moving a copy, unchanged, to the next free id at the end of the log.
