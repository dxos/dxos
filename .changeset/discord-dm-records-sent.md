---
'@dxos/plugin-agent': minor
'@dxos/plugin-discord': minor
---

plugin-discord's direct-message operation records the DM it sends in the agent's chat for that DM (keyed by the DM channel the post opened, with the bot's receipt), through plugin-agent's new `RecordChannelSend` operation, so the person's answer reads in context. EDGE's Discord bot no longer records DMs it posts; the agent owns the DM's chat.
