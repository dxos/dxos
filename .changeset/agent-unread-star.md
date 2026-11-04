---
'@dxos/assistant': minor
'@dxos/agent-runtime': minor
---

`Chat` has an `unread` flag (`Chat.markUnread`, `Chat.markRead`): the agent sets it as a turn ends, and an open chat view clears it for the whole space. The agent service's `isChatOpen` option skips the mark when a view on the same peer has the chat open. In the navtree, an unread chat and a companion chat's subject show a still amber agent star until anyone opens the chat; the flag lives on the chat, so it survives a reload.
