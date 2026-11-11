---
'@dxos/plugin-tasks': patch
---

`tasks.move` no longer requires `taskSet`: omitted, it uses the set holding the task's root, matching the project skill's documented `{ task, parentTask }` call. `tasks.recordSession` now reports a sub-task's project DXN instead of its task set's.
