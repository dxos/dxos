---
'@dxos/echo': minor
---

Move the `Chat` and `Agent` types to `@dxos/assistant` (`@dxos/assistant/Chat`, `@dxos/assistant/Agent`) and bind the agent process to its `Chat` rather than to a message feed: `AgentService.getSession` now takes the chat, reading the feed and steering instructions from it, and `Harness.getChat` resolves the conversation's chat for session-scoped tools.
