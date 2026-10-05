---
'@dxos/agent-runtime': minor
'@dxos/echo': patch
'@dxos/plugin-agent': minor
'@dxos/plugin-discord': minor
'@dxos/plugin-slack': minor
'@dxos/plugin-thread': minor
'@dxos/types': minor
---

`@dxos/plugin-agent` is published, so EDGE can host the agent's operations (fact reading, watches, relays) behind its Discord bot. The agent reads each conversation turn into RDF facts, recalls them across conversations, and keeps one-time and ongoing watches that notify people with updates written from the conversation's context.

The `ProfileOf` relation (profile document → person or organization) moves from `@dxos/plugin-crm` to `@dxos/types`; its typename is unchanged, so existing profiles still resolve.

Agent process input can name its sender, so a message relayed from another channel (e.g. Discord) keeps its author, and an agent's primary chat is no longer replaced by chats bridged from external conversations. `EdgeHttpClient.request` makes an authenticated call to any EDGE route. A plugin that declares two modules with the same id now fails when it is constructed instead of silently losing one. Discord tokens now resolve through the credentials service.

`FormInlineAnnotation` now survives the JSON-schema round trip, so a referenced object a schema marks inline (e.g. an agent's instructions) shows its fields in the properties form instead of a picker.

Agents are channel-agnostic: `@dxos/plugin-thread`'s `ChannelBackendProvider` gains optional `openDirect`, `threads` and `connection` members with generic `sendToChannel`, `openDirect` and `connectChannel`/`disconnectChannel`/`getChannelStatus` operations; `@dxos/plugin-discord` implements a Discord channel backend (with the bot form and status UI); and `@dxos/plugin-agent` talks only through channels (`AgentChannels`, `ensureChannelChat`, `Relay.replyChannel`), dropping its Discord operations and `DiscordBinding`.

`@dxos/plugin-slack` implements a Slack channel backend: agents post as the connection's bot (`chat.postMessage`), reply in threads and open DMs from a person's `slack` identity, and posts are mirrored into the channel so the sync does not duplicate them. The connector now requests `chat:write` and `im:write`; existing Slack connections must reconnect before their channels accept posts, and existing Slack channels move onto the backend on their next sync.
