---
'@dxos/edge-client': minor
'@dxos/plugin-agent': patch
---

`EdgeHttpClient` gains named methods for the agent routes plugin-agent called by path: `provisionBrain`, `addBrainSpace`, `claimMailbox`, `releaseMailbox`, `getMailbox` and `sendMailboxEmail`. plugin-agent now calls those methods instead of building the paths and response schemas itself.
