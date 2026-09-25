---
'@dxos/plugin-tasks': minor
'@dxos/plugin-projects': minor
---

Deleting a task can now be undone, sub-tasks included. `DeleteTask` returns a `TaskRestorePoint` alongside `deleted` — the removed subtree with the position each task held in its set's `tasks` array — and the new `RestoreTasks` operation is registered as its inverse, so the delete raises an undo toast like any other reversible action.

`RestoreTasks` deliberately declares no services. Undo replays an inverse without a spaceId, so `Database.Service` would not resolve; the handler reads the database off the tasks being restored, the same shape `SpaceOperation.RestoreObjects` uses. The tasks travel as objects rather than refs because a ref to a deleted object no longer resolves, which also means the restore point is an in-process payload and not something an agent can hold across a tool call.

`plugin-projects` now declares `dependsOn: ['org.dxos.plugin.tasks']`. A project's tasks are a `TaskSet` rendered by plugin-tasks' own section surface, and the project skill exposes the task verbs. This is enforced: the plugin manager leaves a plugin disabled when a declared dependency is absent, so any host enabling Projects must also supply Tasks. The mobile plugin set did not, and now does.
