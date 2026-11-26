---
'@dxos/agent-code-mode': minor
'@dxos/plugin-sheet': patch
---

Code mode's Effect dialect has a system prompt about a third of its former size, is the default, and lets a program call a skill it just enabled.

- Operations are no longer listed; `yield* search(words)` returns the matching passages of `DOCS` (operations with their DXN, input and output, types, skill instructions, the reference) and what the Skill Manager's lookups find in the skill, operation and type registries beyond them; the prompt names those lookups by DXN.
- Enabled skills are stated by name and description; their instructions are served as `DOCS['skills/<key>.md']`. A dialect opts in with `Dialect.skillInstructions`, and sandboxes carry the texts as `BindingsContext.skillDocs`.
- Operations bound mid-turn are announced by name and DXN.
- Every `eval` result the model reads, failed or not, ends with a reminder that the program's state is gone (`STATE_TRAILER`), and a guessed `Obj.*`/`Filter.*` helper fails with a hint naming what exists.
- A program that enables a skill can resolve and call that skill's operations right away, in the same `eval`, instead of on the next model call. The Skill Manager's code-mode instructions say so for a dialect that supports it (`Dialect.lookupOperations`), and `SkillManagerSkill.makeForCodeMode` takes a `sameProgram` option for it.

`makeCodeModeTurnProducer` writes the Effect dialect when it is given no `dialect`; it used to write the plain one. A sandbox that cannot host the Effect dialect names its own default in `Sandbox.defaultDialect`: `WorkerdSandbox` names `PlainDialect`, so a producer built on it keeps writing plain code. Pass `dialect: PlainDialect` to keep the plain dialect on any other sandbox.

The sheet skill is exported as `@dxos/plugin-sheet/SheetSkill`, so code outside the plugin can bind it.
