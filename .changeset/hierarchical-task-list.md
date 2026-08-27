---
'@dxos/echo': minor
'@dxos/plugin-markdown': minor
---

Render a task set as the sub-task tree it stores, restructurable by dragging a row's handle or with `Alt`+arrow. `TaskList` gains `hierarchical`, `onTaskMove` and controlled `collapsed` state; `Listbox.Item` accepts `onKeyDown`; and the `MoveTask` operation takes an optional `parentTask` so a drop re-parents and repositions in one mutation.
