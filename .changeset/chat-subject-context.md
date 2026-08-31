---
'@dxos/compute': minor
'@dxos/plugin-assistant': minor
---

Chat context binding is now contributed through the `SubjectContext` capability: a chat opened against an object binds whatever every applicable provider derives from it, rather than a hardcoded set of cases. Project chats are ordinary companion chats — `ProjectOperation.CreateChat` is removed, and a project's instructions and skills reach its chat through a contributed provider. Adds `Skill.resolveAnnotatedSkills`, which resolves a type's declared skills across the registry and the space with a space copy (a fork) winning.
