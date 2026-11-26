---
'@dxos/plugin-discord': minor
---

The Discord channel backend is no longer mirrored: it posts every send through the bot's `act` on EDGE, so a relay into another Discord thread and a DM the agent opens are posted at once, with Kai's token too. `ThreadOperation.SendReceipt` gains an optional `thread`, the thread a message landed in; a DM opened by its first post reports its DM channel there, and plugin-agent keys the conversation's chat by it. Discord sends no longer call Discord's REST API from the client with a pasted token.
