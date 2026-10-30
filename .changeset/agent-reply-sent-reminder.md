---
'@dxos/plugin-agent': patch
'@dxos/plugin-discord': patch
---

An agent that answers a Discord thread, DM or email thread in plain text instead of sending its reply is now reminded once to send it, so the person no longer sees "typing…" and then nothing. Channel send operations are marked with `AgentChannels.ChannelSendAnnotation`; a new channel marks its own send operation the same way.
