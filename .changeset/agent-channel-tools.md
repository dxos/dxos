---
'@dxos/plugin-agent': minor
'@dxos/plugin-discord': minor
---

An agent in a channel no longer has its written reply sent back where the message came from: it acts through tools its channel provides. A Discord channel's agent can reply in a channel or thread, send a direct message (to a user id, @handle or contact name) or react to a message; an email channel's agent sends email to its contacts and to anyone who has emailed it. Doing nothing is an option, and the agent may answer somewhere other than where it was asked. A channel declares its tools as a skill on its config type, which every conversation of the channel binds, so the agent core names no channel. Relayed messages are marked `outbound`, the only messages EDGE still posts on the agent's behalf.
