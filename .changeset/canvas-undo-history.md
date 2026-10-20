---
'@dxos/react-ui-canvas': minor
'@dxos/plugin-canvas': minor
'@dxos/app-framework': minor
---

Canvas undo and redo patch the store instead of restoring snapshots. Every edit is a commit of a `CanvasHistory` that records the store's heads before and after and the paths it wrote; undo writes a path back only while nobody has changed it since, and returns the view to the View path and selection the edit was made in. `Canvas.Root` takes `history` (from `useCanvasHistory`, or a `CreateHistory`); without one the canvas keeps a local history, so ⌘Z, ⇧⌘Z and the toolbar work standalone. Breaking: `Projection.snapshot`/`restore`, `withUndo`, `recordViews`, `recordStoreStep` and `CanvasAtoms.undo` are removed; a projection with a model of its own exposes it as `model` (a `VersionedSource`) and may implement `restored()`, and `useViewProjection` now takes `history`. `ViewStore.versions`, `VersionedSource`, `recordChanges` and `patchSource` are exported from `headless`.

In plugin-canvas, a canvas in Composer records its edits on the app's `HistoryTracker` as `CanvasOperation.Patch`, scoped to the canvas, and agents can edit a canvas with `CanvasOperation.Apply` (intents); both are undoable. The ECHO-backed store reads its past through Automerge heads. In app-framework, `UndoMapping` gains `merge` (fold merged invocations into one forward and re-derive the inverse) and `toast` (false records an entry without the deck's undo toast).
