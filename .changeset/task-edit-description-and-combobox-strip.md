---
'@dxos/react-ui-task': patch
'@dxos/react-ui-list': patch
'@dxos/plugin-projects': patch
---

`TaskList.Edit` gains `showDescription`, which edits a description under the title — the selected
task's, or the new task's when creating, so a task can be added with one. The combobox trigger now
collapses its caret column when a caller supplies its own children, which was painting a strip of
trigger surface beside the field.
