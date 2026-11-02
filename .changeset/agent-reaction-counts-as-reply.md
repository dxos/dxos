---
'@dxos/plugin-discord': patch
---

A Discord reaction now counts as the agent's answer in that conversation, so an agent that acknowledges a message with 👍 is no longer reminded to send a reply. `discord.addReaction` reports the channel it reacted in.
