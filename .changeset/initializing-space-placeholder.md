---
'@dxos/plugin-space': patch
'@dxos/plugin-navtree': patch
'@dxos/app-toolkit': patch
---

A space that cannot finish initializing (e.g. its replication is stalled server-side) no longer disappears from the workspace list. It stays listed as a disabled loading placeholder showing its cached name, and the workspace panel says it is connecting instead of claiming you don't have it. Graph connectors skip such a space, so no plugin queries a database that is not open yet.
