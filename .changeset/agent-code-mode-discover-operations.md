---
'@dxos/agent-code-mode': minor
---

The Effect dialect's system prompt is about a third of its former size; the model looks up what it used to be handed:

- Operations are no longer listed; `search(words)` returns the matching passages of `DOCS` (operations with their DXN, input and output, types, skill instructions, the reference), and the prompt names the Skill Manager's lookups by DXN.
- Enabled skills are stated by name and description; their instructions are served as `DOCS['skills/<key>.md']`. A dialect opts in with `Dialect.skillInstructions`, and sandboxes carry the texts as `BindingsContext.skillDocs`.
- Operations bound mid-turn are announced by name and DXN.
- Every `eval` result the model reads, failed or not, ends with a reminder that the program's state is gone (`STATE_TRAILER`), and a guessed `Obj.*`/`Filter.*` helper fails with a hint naming what exists.
