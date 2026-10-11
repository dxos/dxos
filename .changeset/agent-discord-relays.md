---
'@dxos/plugin-agent': minor
---

An agent on Discord relays through the Discord bot, and the setup panels read more clearly.

- `@dxos/plugin-agent`: a relay is written into the recipient's conversation and posted by EDGE's Discord bot, which holds the token, so relays work where the space has none. It reaches a person in their Discord thread or a new DM before a Composer chat, and records the conversation it was asked in instead of asking the model for it. The Activity panel shows the agent, its skills, channels and conversations (oldest first), toolbar connect and disconnect, a channel missing from the space, and hover on its rows; the Knowledge panel's Reset forgets memories and goals.
- `@dxos/plugin-thread`: a channel backend can declare that a host posts what the agent writes (`ChannelBackendProvider.mirrored`).
- `@dxos/plugin-discord`: connecting a Discord channel gives the agent a channel of its own, named after it; archived channels are hidden; and the package is published with `@dxos/crawler` and `@dxos/pipeline-discord`.
- `@dxos/react-ui-debug`: `Logger` rows centre their text and keep one ringed row.
