---
'@dxos/plugin-agent': minor
---

An agent's brain is named by `AgentPresence.brainId`: its identity's DID when it has one, and its id otherwise, as before. A watch records the agent it was set through (`Trigger.origin`), and an agent delivers only the watches set in its own space (`AgentPresence.delivers`); `TriggerOperation.RunDue` delivers whatever its space has queued.
