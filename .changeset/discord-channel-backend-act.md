---
'@dxos/plugin-discord': minor
'@dxos/plugin-thread': minor
---

The Discord channel backend posts every send through the bot's `act` on EDGE, so a relay into another Discord thread and a DM the agent opens are posted at once, with Kai's token too; Discord sends no longer call Discord's REST API from the client with a pasted token. Mirrored delivery is removed: `ChannelBackendProvider.mirrored` and `ChannelBackend.isMirrored` are gone, and an agent posts every channel message through `SendToChannel`. Where the backend's capability is not visible (its own bundle on EDGE), `SendToChannel` and `OpenDirect` invoke the backend's own operations from `ThreadOperation.backendOperations(kind)`, which plugin-discord handles. `ThreadOperation.SendReceipt` gains an optional `thread`, the thread a message landed in; a DM opened by its first post reports its DM channel there, and plugin-agent keys the conversation's chat by it.
