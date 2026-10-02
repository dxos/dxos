---
'@dxos/agent-runtime': minor
'@dxos/plugin-discord': patch
---

Agent process input can name its sender, so a message relayed from another channel (e.g. Discord) keeps its author, and an agent's primary chat is no longer replaced by chats bridged from external conversations. `EdgeHttpClient.request` makes an authenticated call to any EDGE route. A plugin that declares two modules with the same id now fails when it is constructed instead of silently losing one. Discord tokens now resolve through the credentials service.
