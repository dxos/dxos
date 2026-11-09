---
'@dxos/agent-code-mode': minor
---

Add discovery mode to code mode: `makeCodeModeTurnProducer({ discovery: true })` states one skill, Discovery, in place of the conversation's skills, operations and types. The model finds them from code with the skill's three operations: `loadSkill` lists the skills it can use and loads one (enabling it when an agent may), `queryOperations` searches their operations and gives one's input and call, and `queryTypes` searches the registered types and gives their fields. The enabled skills' operations stay callable, and the default (listed) mode is unchanged. A `Dialect` now also states an operation's call and input (`signature`), which the prompt and discovery share.
