---
'@dxos/plugin-tasks': minor
'@dxos/react-ui-task': minor
'@dxos/app-toolkit': minor
'@dxos/plugin-space': minor
'@dxos/plugin-projects': minor
---

A task list's toolbar gains a status selector: a menu of checkboxes, one per status, choosing which statuses the list shows. Hiding a status hides the tasks filed under it too — a sub-task is part of the work its parent stands for — while the query beside it still keeps the ancestors of a match, so searching a narrowed list cannot bring a hidden branch back. Clearing the filter restores every status.

Arrow keys move through a task list without selecting, and `Enter` opens the focused row. Selecting a task opens its detail, so following focus opened the detail of every row a reader passed on the way to the one they wanted.

A `cardStack` surface renders a list of objects as cards, one under another — `plugin-space` implements it, and a host supplies what belongs in the stack rather than the surface deriving it from a subject. A task's companion uses it to show the task's artifacts beneath its editor.
