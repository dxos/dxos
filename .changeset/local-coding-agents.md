---
'@dxos/ai': minor
'@dxos/plugin-assistant': minor
---

Chats can run on a coding agent other than Composer's own: `SessionConfig` gains `harness` (which agent runs the chat) and `host` (the device that runs it), and plugins register agents through `AssistantCapabilities.Agent`, which the agent service now consults per chat. `plugin-code` adds the desktop app's agent helper and an ACP turn engine that streams the agent's transcript into the chat, keeps its session warm between turns and resumes it after a restart; `plugin-claude` uses it to offer Claude Code on the user's machine. An agent's permission requests arrive as a `request` content block, rendered as a card whose answer goes back through `AssistantOperation.RespondToRequest`. `MakeTurnProducerOptions` now includes the `chat`.
