---
'@dxos/echo': patch
---

Diff chunks in a walkthrough (`diffBlocks` in `@dxos/ui-editor`) are highlighted in context: each
chunk is parsed after its hunk header's enclosing line, so a chunk that opens inside a declaration
colours its members as properties and types rather than leaving them plain, and chunks use the
editor's own highlight style for the current theme. `TaskList` rows in `@dxos/react-ui-task` show a
task's tags beside its artifact and assignee chips.
