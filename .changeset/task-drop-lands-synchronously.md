---
'@dxos/plugin-tasks': patch
'@dxos/types': minor
---

Dragging a task in a task set now lands where it was dropped instead of snapping back to its old
position for about a second first.

Two things held it up. The drop invoked the `MoveTask` verb, whose handler resolves the owning set
and validates the parent through index-backed queries before it writes, and in the browser each of
those is a worker round trip. And the article subscribed to membership and array order only, so a
re-parent — which changes neither — reflowed the tree only once the query happened to re-emit after
indexing.

`TaskSet.moveTask` is the verb's write half, extracted and synchronous: reposition in the array,
re-parent when asked. `TaskSetArticle` applies it against objects the list already holds, and the
verb keeps its validation and calls the same helper, so a gesture and an agent call cannot write
different things. Validating the placement is the caller's job either way — `resolveParentTask` in
the verb, the rendered tree in the list. Drag and the `Alt`+arrow / `Tab` moves no longer pass
through the operation invoker as a result, so they no longer appear in operation history;
`MoveTask` has no undo mapping, so no undo behavior changes.

The article's task list now derives from one atom over the set's `tasks` array and every member's
`parentTask`, which also fixes a remote peer's re-parent waiting on the index.
