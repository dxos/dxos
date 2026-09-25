---
'@dxos/react-ui-task': minor
---

A task row now shows its questions one line each, with no answer controls. The full question (context, options, answer field) moves to `TaskList.Edit`, which shows the selected task's open questions and answers them through `onQuestionAnswer`. `TaskQuestion` gains a `compact` prop for the one-line form. Breaking: a host that answered questions in list rows must now render `TaskList.Edit` for the selected task.
