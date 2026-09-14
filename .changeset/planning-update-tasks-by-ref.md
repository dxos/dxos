---
'@dxos/assistant-toolkit': minor
'@dxos/plugin-debug': patch
---

The planning skill's `update-tasks` tool now addresses tasks by ref and takes a batch of `changes` that can create, edit, assign or unassign a task, replacing `assign-tasks`; starting or assigning a task puts it on the chat's checklist and makes the conversation's agent its assignee. A new Weather MCP space template exercises this end to end: its task text spells out everything the browser MCP client needs from the Worker it asks for, and the sample exports the `FORECAST_URL` the tool wraps. Breaking: the `tasks` input and the `AssignTasks` operation are removed.
