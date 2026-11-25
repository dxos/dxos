---
'@dxos/plugin-agent': patch
---

When the Relay skill cannot deliver a message with `sendMessage` and the agent knows the recipient's Discord user id, the agent now sends the message with Discord's own direct-message tool. This restores direct messages from agents that run in a plugin bundle on EDGE, where `thread.openDirect` cannot reach Discord's channel backend.
