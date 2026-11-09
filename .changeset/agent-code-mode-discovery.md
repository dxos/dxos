---
'@dxos/agent-code-mode': minor
---

Code mode's prompt now states one skill, the Skill Manager, in place of the conversation's skills, operations and types, and the model finds them from code through its operations. The Skill Manager gains `queryOperations` (searches the operations of the skills an agent can use, and gives one's input on lookup) and `queryTypes` (searches the registered types, and gives their fields), and `querySkills` now returns light rows saying whether each skill is enabled here and whether an agent may enable it, with a skill's instructions and operations on lookup by key. Tool calling still lists every skill, its operations as tools and the types. Type and input descriptions move to `@dxos/assistant/Describe` so both share them.
