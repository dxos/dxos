# @dxos/plugin-agent

Manages autonomous agents in a space: assistant `Agent` objects that talk to people
from Discord threads and Composer chats.

- `DiscordBinding` binds an agent to a Discord bot (access token, application id, guild, channels).
- `ensureThreadChat` maps a Discord thread to a `Chat` parented to the agent, keyed by the thread id
  (`Obj.Meta` key `{ source: 'discord.com', id: threadId }`), so repeated calls return the same chat.
  The EDGE Discord gateway calls it to route thread messages into the agent's conversation.
- The plugin ships a workerd variant (`./AgentPlugin` resolves without React) so EDGE's
  operation service can host the operations.

Docs: [design](./docs/DESIGN.md), [memory and profiles](./docs/MEMORY.md), [developing behaviour](./docs/TESTING.md), [memory ontology](./docs/ONTOLOGY.md), and
[end-to-end setup with Discord](./docs/SETUP.md).

License: [FSL-1.1-Apache-2.0](./LICENSE) Copyright 2026 © DXOS
