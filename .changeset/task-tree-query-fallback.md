---
'@dxos/types': patch
---

Fix `tasks.update` (and every other operation that walks a task tree) failing on EDGE with `Query execution failed`. The parent-edge and task-set lookups fall back to the task lists when the index rejects the query, as they were meant to, instead of failing the operation.
