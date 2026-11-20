---
'@dxos/plugin-agent': patch
---

An agent in a conversation no longer resolves and records what people tell it before replying; the Brain skill records each turn's facts after it, attributed to whoever said them, and now keeps a decision stated with "we" (as `decided`) instead of dropping it. The agent still records facts from earlier messages shown to it as context, such as a channel's recent messages, in the same steps as the requested work.
