---
'@dxos/types': minor
'@dxos/plugin-tasks': minor
'@dxos/react-ui-task': minor
---

`Task.estimate` is a t-shirt size (`xs` | `s` | `m` | `l` | `xl`) rather than a bare number, annotated as a single-select like `Task.priority`. A size is what a reader can agree on without knowing a team's point scale, and the previous field carried a `TODO` asking whether its unit was hours or Fibonacci — it had no answer.

**This is a breaking change for stored data**: existing numeric estimates no longer satisfy the schema. There is no migration in this change.

`Task.Status` also gains `backlog`, `blocked` and `duplicate`.

The task list renders the estimate beside the priority control, behind a new `showEstimates` prop on `TaskList.Root`, and the two description flags (`showDescriptions` on rows, `showDescription` on the edit pane) are reconciled into a single `showDescription`.

Linear sync maps between the two vocabularies rather than dropping the field: points bucket into sizes on the way in (`1→xs`, `2→s`, `3→m`, `5→l`, `8+→xl`) and each size pushes its bucket's representative point value on the way out. That is lossy in one direction by construction — a size does not record which large number it came from — so an issue estimated at 13 in Linear round-trips as 8 once edited locally.
