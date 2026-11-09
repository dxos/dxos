---
'@dxos/agent-code-mode': minor
---

Code mode now states one skill, Discovery, in place of the conversation's skills, operations and types, and the model finds them from code with the skill's three operations: `loadSkill` lists the skills it can use and loads one (enabling it when an agent may), `queryOperations` searches their operations and gives one's input and call, and `queryTypes` searches the registered types and gives their fields. The enabled skills' operations stay callable. Listing everything, each operation as a tool, remains tool calling's behaviour when code mode is off. A `Dialect` now also states an operation's call and input (`signature`), which the prompt and discovery share.
