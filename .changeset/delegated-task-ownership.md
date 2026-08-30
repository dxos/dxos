---
'@dxos/echo': patch
---

Delegating a task to a chat no longer moves it out of the set that owns it: a chat's checklist (`Chat.tasks`) records what the conversation works on, while ownership stays with whoever created the task.
