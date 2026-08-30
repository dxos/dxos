---
'@dxos/echo': minor
'@dxos/plugin-markdown': patch
---

`Task.edit`, `Task.setStatus`, `Task.assign` and `Task.appendHistory` write a field and the activity-log entry describing it in one transaction; an edit that changes nothing records nothing. `UpdateTask` goes through them, so a patched task now carries its own history.

`Task` gains `reviewers` (an optional `Actor` array), `artifacts` (refs to what the task produced), and a `review` status — a task with reviewers lands there rather than `done`. Bumped to `0.5.0`.

**Breaking:** `TaskEdit` and `TaskDraft` are gone from `@dxos/react-ui-task` — the editable surface of a task now has one definition, `Task.Edit` and `Task.Draft` in `@dxos/types`, shared by the list UI, the mutation helpers and the `UpdateTask` operation. `UpdateTask` accepts `null` to clear `description`, `priority`, `estimate` and `assignee`; it could previously set an assignee but never remove one.

**Breaking:** `Task.Event` is now `created | updated` — the `status-changed`, `assigned`, `moved`, `commented` and `delegated` literals are gone, and a history entry's `description` is optional. Nothing wrote the log before this release, so no stored task carries a removed value.

A plugin can now put a menu item on another plugin's object: `ObjectAction<T>` in `@dxos/app-toolkit` is the shared shape, and a host declares a capability over it. plugin-tasks declares `TaskAction`, so a task row shows contributed actions — plugin-projects contributes `Discuss in chat`, which opens a chat carrying the task in its checklist.

**Breaking:** `TaskList.Root`'s `onTaskDelete` is replaced by `getTaskActions`, which returns the row's menu items; delete is now an ordinary action the container supplies. One item renders as a button, several as an overflow menu.

**Breaking:** a chat's checklist no longer owns the tasks on it. `Chat.tasks` was an owning field, so adding a task re-parented it — a task delegated from a project disappeared from that project's task list. `Chat.addTask` parents what it creates, a delegated task keeps the parent it arrived with, and `Chat.deleteTask` deletes only members the chat owns. `AssistantOperation.RunPromptInChat` opens a chat and queues its first turn, which is how delegation now starts one: a session spawned outside the chat's UI carries a different model, and the mismatch terminated the running process mid-turn.
