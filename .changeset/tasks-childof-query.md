---
'@dxos/types': minor
'@dxos/plugin-tasks': patch
---

Task-set membership is now the ECHO parent edge: `Annotation.SetParent` on the set's `tasks`/`milestones` arrays parents every member to the set, `Task.parentTask` stays an app-level relationship, and the task list and outline link labels enumerate via `Filter.childOf(taskSet)` instead of resolving the ref array. Array order stays canonical, applied via the new `TaskSet.orderTasks`; deleting a task sweeps its subtree explicitly in the delete verb.
