---
'@dxos/assistant-toolkit': minor
---

Breaking: the Memory skill (`org.dxos.skill.memory`) and its `Memory` type are removed, with the `@dxos/assistant-toolkit/Memory` and `@dxos/assistant-toolkit/MemorySkill` subpaths. Agents keep knowledge in the space's memory (`MemoryService`) and read it with Brain's fact tools instead. Composer's agent now explores its skills and operations before saying it cannot answer.
