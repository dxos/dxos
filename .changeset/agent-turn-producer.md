---
'@dxos/agent-runtime': minor
'@dxos/plugin-assistant': minor
---

Add a `TurnProducer` seam to the agent process so an alternative engine can produce conversation turns: `AgentServiceOptions.makeTurnProducer` injects the producer (defaulting to the built-in `AiSession`), and the new `AssistantCapabilities.AgentTurnProducer` capability lets a plugin contribute one.
