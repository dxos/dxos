---
'@dxos/assistant': minor
---

`Chat` has an `unread` flag that the agent sets as each turn ends and an open chat view clears for the whole space (`Chat.markUnread`, `Chat.markRead`). In the navtree, a chat with an unread turn, and the object a companion chat works on, show a still amber agent star until anyone opens the chat; the flag is stored on the chat, so it survives a reload.
