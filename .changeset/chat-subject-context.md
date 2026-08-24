---
'@dxos/compute': minor
'@dxos/plugin-assistant': minor
---

Chat context binding is now contributed through the `SubjectContext` capability: a chat opened against an object binds whatever every applicable provider derives from it, rather than a hardcoded set of cases. Adds `Skill.annotatedSkillRefs` and `Skill.annotatedSkillKeys` for reading a type's declared skills.
