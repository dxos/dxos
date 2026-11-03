---
'@dxos/types': minor
'@dxos/plugin-tasks': minor
---

A task now has a `delegate` beside its `assignee`: handing a task to an agent sets the delegate and leaves the person as assignee, who signs off a finished task from `review`. Breaking: `Task.reviewers` is removed, and `Task` moves to 0.7.0. `TaskMigration.migrations` converts a delegated task's agent assignee and reviewer to a delegate and an assignee. The task list follows Linear, with priority beside status, an assignee picker on every row, and an add-task form whose properties are pills.
