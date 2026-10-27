---
'@dxos/app-framework': minor
---

`HistoryTracker` adds redo, per-scope undo and redo (`undo(scope)`, `canRedo(scope)`), `transaction(label, effect)` to record several invocations as one entry, merging of consecutive edits within a configurable window, and an `applied` stream that carries each entry's caller context. `UndoMapping.make` takes optional `scope`, `mergeKey` and `context` functions. Unscoped `undo`, `canUndo` and `undoPromise` behave as before.
