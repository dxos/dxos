---
'@dxos/mcp-server': minor
---

`loadSkill` now returns a one-word `skillToken`, and `invokeOperation` accepts the operation only when it is passed that token for a skill that governs the operation. Tokens derive from a host-supplied `skillSecret`, so hosts no longer record loaded skills. Breaking: `SkillLedger`, `memorySkillLedger`, `invokeWithLedger` and `HostShape.skillLedger` are removed, replaced by `SkillGate`, `skillGate(secret)` and `HostShape.skillSecret`.
