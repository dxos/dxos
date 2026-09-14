---
'@dxos/assistant-toolkit': minor
'@dxos/plugin-debug': patch
---

The planning skill's `update-tasks` tool now addresses tasks by ref and takes a batch of `changes` that can create, edit, assign or unassign a task, replacing `assign-tasks`; starting or assigning a task puts it on the chat's checklist and makes the conversation's agent its assignee, which a new Weather MCP space template exercises end to end. Breaking: the `tasks` input and the `AssignTasks` operation are removed.
