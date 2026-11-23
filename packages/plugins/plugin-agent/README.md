# @dxos/plugin-agent

Manages autonomous agents in a space: assistant `Agent` objects that talk to people
in channels (Discord, freeq, local feeds) and Composer chats.

- `AgentChannels` lists the `Channel`s an agent converses in. Backends (Discord in plugin-discord)
  implement plugin-thread's `ChannelBackendProvider`; this plugin reaches them only through
  plugin-thread's `sendToChannel` / `openDirect` operations.
- `ensureChannelChat` maps a channel conversation (the channel, or a thread or DM inside it) to a
  `Chat` parented to the agent, keyed by `{ source: 'org.dxos.agent/channel', id: '<channelId>[/<thread>]' }`,
  so repeated calls return the same chat.
- The plugin ships a workerd variant (`./AgentPlugin` resolves without React) so EDGE's
  operation service can host the operations.

Docs: [design](./docs/DESIGN.md), [facts and profiles](./docs/FACTS.md), [developing behaviour](./docs/TESTING.md), [knowledge ontology](./docs/ONTOLOGY.md), and
[setup: environments, Composer, Storybook, Discord and email](./docs/SETUP.md).

License: [FSL-1.1-Apache-2.0](./LICENSE) Copyright 2026 © DXOS
