---
'@dxos/types': minor
'@dxos/plugin-tasks': patch
---

Task sets enumerate through the space index: the task list and outline link labels query `Filter.childOf(taskSet)` instead of resolving the set's ref array, with array order applied via the new `TaskSet.orderTasks`.
