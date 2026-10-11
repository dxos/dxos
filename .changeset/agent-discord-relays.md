---
'@dxos/plugin-agent': minor
---

An agent on Discord relays through the Discord bot, which holds the token, so relays work where the space has none.

- `@dxos/plugin-agent`: a relay is written into the recipient's conversation and posted by EDGE's Discord bot. It reaches a person in their Discord thread or a new DM before a Composer chat, and records the conversation it was asked in instead of asking the model for it. The Activity panel shows the agent's name and id, lists skills before channels and conversations in the order they started, and shows a channel missing from the space as one.
- `@dxos/plugin-thread`: a channel backend can declare that a host posts what the agent writes (`ChannelBackendProvider.mirrored`).
- `@dxos/plugin-discord`: connecting a Discord channel gives the agent a channel of its own, named after it; the package is published, with `@dxos/crawler` and `@dxos/pipeline-discord`.
