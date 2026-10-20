---
'@dxos/react-ui-canvas': minor
'@dxos/plugin-canvas': minor
---

Canvas undo and redo now patch the store instead of restoring snapshots, and a canvas in Composer records its edits on the app's undo history, so agents can edit a canvas with the undoable `CanvasOperation.Apply`, which refuses malformed intents. Converting a drawing to another variant now makes a copy beside the source by default, and a plugin can register an `IllustratorCapabilities.Converter` for a pair of variants; plugin-canvas registers one for tldraw that keeps hand-drawn shapes. A polygon can fit its frame or the circle inside it and round its corners, a link caption takes a font size, and the docked properties panel stays with nothing selected and remembers which groups are open.

Breaking: `Projection.snapshot`/`restore`, `withUndo`, `recordViews`, `recordStoreStep` and `CanvasAtoms.undo` are removed in favour of `CanvasHistory` (`Canvas.Root` takes `history`); `CanvasOperation.ImportTldraw` is removed in favour of the converter; `ThemePanel` is renamed `DisplayPanel`; and a polygon's `sides` and `fit` and a cloud's `bumps` move into the node's `params`, with stored drawings read in the new shape.
