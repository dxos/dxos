# @dxos/plugin-interlocutor

Manages autonomous "interlocutor" agents in a space: assistant `Agent` objects that talk to people
from Discord threads and Composer chats.

- `DiscordBinding` binds an agent to a Discord bot (access token, application id, guild, channels).
- `ensureThreadChat` maps a Discord thread to a `Chat` parented to the agent, keyed by the thread id
  (`Obj.Meta` key `{ source: 'discord.com', id: threadId }`), so repeated calls return the same chat.
  The EDGE Discord gateway calls it to route thread messages into the agent's conversation.
- The plugin ships a workerd variant (`./InterlocutorPlugin` resolves without React) so EDGE's
  operation service can host the operations.

License: [FSL-1.1-Apache-2.0](./LICENSE) Copyright 2026 © DXOS
