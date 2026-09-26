---
'@dxos/types': minor
---

Task sets are now hierarchical. `TaskSet.tasks` lists only the root tasks, and each task lists its own sub-tasks in
the new ordered `Task.subtasks`, which owns them: a sub-task's ECHO parent is its parent task, so `Filter.childOf`
finds it and deleting a task deletes its subtree. `Task.parentTask` is removed; read a task's parent with
`Task.getParentTask`. `Task` moves to 0.6.0 and `TaskSet` to 0.4.0, and `TaskMigration.migrations` converts existing
data, moving each flat-list sub-task into its parent's `subtasks` in its old order. `TaskSet.resolveTasks` and
`TaskSet.loadTasks` still return every task in a set, now in tree order; `Task.orderTree` orders a queried task list
the same way.

A task with sub-tasks is one unit of work that lands in one PR. Assigning or starting any task in a tree through
`tasks.update` claims the root and every sub-task with it. `tasks.addArtifact` (and `projects.addArtifact` with a
task) records a pull request on the root of the tree, and refuses with `Task.PullRequestConflictError` when any task in
the tree already has a different open PR. `Task.collectRoot` (synchronous, off the parent edge) and `Task.collectTree`
resolve a task's tree.

Membership survives concurrent edits: every list write splices in place (`TaskSet.insertInPlace`,
`TaskSet.reorderInPlace`, `TaskSet.removeRefsInPlace`) instead of reassigning, which dropped an entry another peer had
just added. A task whose parent edge names a set or task that no longer lists it is re-listed there
(`TaskSet.ensureMember`) rather than refused, and a rejected drop in the task list shows a toast instead of throwing.
`TaskSet.removeTasksFromSet` and `TaskSet.applyParentTask` are removed: `TaskSet.detach` takes a task out of the list
that holds it, and `TaskSet.moveTask` re-parents and positions it in one call.
