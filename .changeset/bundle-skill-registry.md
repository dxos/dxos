---
'@dxos/protocols': minor
---

`PluginProtocol.Env` gains an optional `SKILL_REGISTRY` (`PluginProtocol.SkillRegistry`): EDGE lists every enabled plugin's skills and the operation records their tools name, and a plugin bundle's host adds them to each invocation's registry. A skill bound by registry URI, and the skill manager's `querySkills`, then resolve in a bundle whichever plugin contributes the skill, not only the bundle's own.
