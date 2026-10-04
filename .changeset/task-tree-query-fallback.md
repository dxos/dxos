---
'@dxos/types': patch
---

Fix `tasks.update` (and every other operation that walks a task tree) failing on EDGE with `Query execution failed`. When the index rejects the parent-edge (`child-of`) query, `Task.collectSubtree` now finds edge-only sub-tasks from one task scan grouped by parent instead of failing the operation; if that scan fails too, the error still propagates rather than returning a partial tree.
