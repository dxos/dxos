---
'@dxos/plugin-agent': minor
---

`MemoryOperation.Recall` is now `org.dxos.operation.agent.retrieveFacts`, so agents see a `retrieveFacts` tool. Breaking for stored tool keys: a skill, blueprint or trigger that names `org.dxos.operation.agent.retrieveMemories` must use the new key, since no alias is kept.
