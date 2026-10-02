---
'@dxos/agent-runtime': minor
'@dxos/plugin-discord': patch
---

Agent process input can name its sender, so a message relayed from another channel (e.g. Discord) keeps its author, and an agent's primary chat is no longer replaced by chats bridged from external conversations. Discord tokens now resolve through the credentials service.
