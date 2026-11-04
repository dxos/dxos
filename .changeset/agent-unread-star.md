---
'@dxos/plugin-assistant': minor
---

A chat whose agent finishes a turn while no view of it is open shows the agent star at its navtree glyph's corner, and so does the object a companion chat works on, until the chat is opened. The new `AssistantCapabilities.ChatReads` capability tracks which chats are unread, in memory only.
