---
'@dxos/assistant-toolkit': minor
---

Added an `assign-tasks` tool to the planning skill. It takes `add` and `remove` arrays of references to tasks that already exist and mutates the conversation's checklist accordingly, so an agent can pick up a task owned elsewhere (a project's task set, another conversation) or drop one it is no longer working on. Membership only — unlike `update-tasks` it never creates or edits a task, and removing one does not delete it.

`Chat.assignTasks` / `Chat.unassignTasks` back the tool and are exported for direct use.
