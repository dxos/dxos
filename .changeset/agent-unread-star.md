---
'@dxos/assistant': minor
'@dxos/agent-runtime': minor
---

`Chat` has an `unread` flag that the agent sets as each turn ends and an open chat view clears for the whole space (`Chat.markUnread`, `Chat.markRead`). The agent service's `isChatOpen` option skips the mark when a view on the same peer has the chat open. In the navtree, a chat with an unread turn, and the object a companion chat works on, show a still amber agent star until anyone opens the chat; the assistant reports it as a done progress monitor, and the flag is stored on the chat, so it survives a reload.
