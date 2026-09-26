---
'@dxos/types': minor
---

A task with sub-tasks is now one unit of work that lands in one PR. Assigning or starting any task in a tree through
`tasks.update` claims the root and every sub-task with it.
`tasks.addArtifact` (and `projects.addArtifact` with a task) records a pull request on the root of the tree, and
refuses with `Task.PullRequestConflictError` when the root already has a different open PR. `Task.collectRoot` and
`Task.collectTree` resolve a task's tree.

Task-set membership also survives concurrent edits: reordering and removing tasks splice the `tasks` array in place
(`TaskSet.reorderInPlace`, `TaskSet.removeRefsInPlace`) instead of reassigning it, which dropped a task another peer
had just added. A task still parented to its set but missing from the array is re-listed (`TaskSet.ensureMember`)
rather than refused as a parent, and a rejected drop in the task list shows a toast instead of throwing.
`TaskSet.reorder` is removed; use `TaskSet.reorderInPlace`, or `TaskSet.reorderItems` for a pure reorder.
