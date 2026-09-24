---
'@dxos/plugin-tasks': minor
'@dxos/react-ui-task': minor
'@dxos/react-ui-list': patch
'@dxos/app-toolkit': minor
'@dxos/plugin-space': minor
'@dxos/plugin-projects': minor
---

A task list's toolbar gains a status selector: a menu of checkboxes, one per status, choosing which statuses the list shows. Hiding a status hides the tasks filed under it too — a sub-task is part of the work its parent stands for — while the query beside it still keeps the ancestors of a match, so searching a narrowed list cannot bring a hidden branch back. Clearing the filter restores every status.

Arrow keys move through a task list without selecting, and `Enter` opens the focused row. Selecting a task opens its detail, so following focus opened the detail of every row a reader passed on the way to the one they wanted.

A `cardMasonry` surface renders a list of objects as cards — `plugin-space` implements it, and a host supplies what belongs in the grid rather than the surface deriving it from a subject. A task's companion uses it to show the task's artifacts beneath its editor. Cards also sit a step above the surface behind them (`--color-card-surface` moves to the raised level), so an unbordered card is legible against the plank it is on.

A windowed tree fills its container again: the row window was positioned with `inline-start-0`/`inline-end-0`, utilities the Tailwind v4 migration dropped, so it had no insets and shrink-wrapped its rows to the width it first measured — a task list or navtree in a wide plank kept a narrow column of rows.
