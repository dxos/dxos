---
'@dxos/react-ui-assistant': minor
'@dxos/plugin-assistant': minor
---

A submitted chat prompt shows in the thread at once, before it is persisted, and carries messenger-style delivery ticks (sent, delivered, read) until the agent takes it up; a prompt that fails to send offers retry and remove in place. Queued prompts now render in the thread itself, so `Chat.Queue` and `ChatQueueList` are removed, and `AiChatProcessor` gains `send`, `retryPrompt`, `removePrompt` and an `outbox` atom.
