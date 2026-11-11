---
'@dxos/agent-code-mode': minor
'@dxos/assistant-toolkit': minor
---

Code mode states the skills enabled in the conversation, with their instructions and their operations' inputs, beside the Skill Manager's lookups; other skills, operations and types are still looked up from code. An enabled skill's rules apply to every request it touches, and a channel agent that had to look up how to reply did not. `SkillManagerSkill.makeForCodeMode()` now carries only the lookups (`querySkills`, `queryOperations`, `queryTypes`, `enableSkills`): its MCP connection operations reach a conversation only through a bound Skill Manager, as under tool calling.
