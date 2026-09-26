---
'@dxos/plugin-tasks': patch
---

`org.dxos.operation.tasks.moveToSet` now rejects a task that belongs to no task set and a target set in another space, instead of filing the task in two sets or across spaces. The `Move to…` dialog stays open and shows the reason when a move fails, rather than closing as if it had worked.
