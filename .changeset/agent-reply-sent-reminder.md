---
'@dxos/plugin-agent': patch
---

An agent that answers a Discord thread, DM or email thread in plain text instead of sending its reply is now reminded once to send it, so the person no longer sees "typing…" and then nothing. Channel send operations are marked with `AgentChannels.channelSend(field)`, naming the output field that says where the message went; a new channel marks its own send operation the same way.
