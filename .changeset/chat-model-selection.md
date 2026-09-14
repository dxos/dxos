---
'@dxos/assistant': minor
---

The model a chat runs on is now stored on the `Chat` object (`Chat.model`, a ref carrying the model DXN) and read by the agent process from the chat, so the selection survives remounts and travels with the conversation. `AgentService.getSession` no longer takes a `model` option; the layer's `model` option is the default for chats that have not selected one. The chat prompt's model picker edits the chat's selection instead of a per-mount setting.
