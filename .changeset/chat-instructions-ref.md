---
'@dxos/echo': minor
'@dxos/plugin-assistant': minor
---

Chats carry a typed `instructions` ref rendered into the system prompt at request time (replacing typename-based inlining of bound Instructions objects, which now bind as ordinary context objects), and the new Project skill lets the assistant file created objects into a project's artifacts collection and list them.
