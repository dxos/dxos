---
'@dxos/react-ui-task': minor
---

A task row now shows its questions one line each, with no answer controls. The full question (context, options, answer field) moves to `TaskList.Edit`, which shows the selected task's open questions on the pane's own columns and answers them through `onQuestionAnswer`. `TaskQuestion` gains `compact` for the one-line form, and `subgrid`/`cells` to lay out on a host's columns. Breaking: a host that answered questions in list rows must now render `TaskList.Edit` for the selected task.
