---
'@dxos/assistant-toolkit': minor
'@dxos/plugin-assistant': patch
---

Fix live sub-agent delegation: the `completeJob` tool schema is now sent to the provider verbatim (the structured-output transformer produced empty subschemas the Anthropic API rejects), and delegation failures post a concise message instead of a stack trace. Breaking: `Chat.outline` is replaced by `Chat.taskSet` — the conversation's working surface is a durable `TaskSet` (planning and delegation write `Task` objects; standalone chats delegate into their own set); the `Task.Status` literal `in-progress` is renamed `started` (named `Task.Priority`/`Task.Status` schemas are now exported); and `TaskList.Root` gains a `showGroupLabels` prop.
