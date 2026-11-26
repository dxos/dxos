---
'@dxos/agent-code-mode': minor
'@dxos/plugin-sheet': patch
---

Code mode now defaults to the Effect dialect, whose much smaller prompt has the model look up operations, types and skill instructions on demand, and a program can call the operations of a skill it enabled in the same `eval`, on EDGE too; pass `dialect: PlainDialect` to keep the plain dialect. On EDGE, operations invoked for a conversation (such as enabling a skill) work again, and the sheet skill is exported as `@dxos/plugin-sheet/SheetSkill`.
