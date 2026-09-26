---
'@dxos/plugin-tasks': minor
---

Add a `Move to…` action on task rows that moves a task, with its sub-tasks, into another project, backed by a new `org.dxos.operation.tasks.moveToSet` operation. Moved tasks lose their milestone (milestones belong to the old task set) and keep their `dependsOn` links.
