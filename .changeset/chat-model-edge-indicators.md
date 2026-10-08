---
'@dxos/compute': minor
'@dxos/plugin-assistant': minor
---

A chat hosted on EDGE now shows its working indicators, phases and streamed reply for the whole turn, instead of reading idle while the agent works. `AgentProcess` takes a `resident` option that keeps the process for the next prompt rather than spawning a new one per turn, and `subscribeEphemeral` takes `{ replay }`. Breaking: plugin-assistant's `AiChatProcessor` is now `ChatModel` (`useChatProcessor` → `useChatModel`, `getProcessorState` → `getChatModelState`, and the `processor` prop of `Chat.Root`/`ChatPrompt` → `chatModel`).
