---
'@dxos/react-ui-canvas-editor': patch
---

An element that an undo or a peer removes from the open layout is no longer selected, in the 2D and the 3D editor. The selection kept naming it, so Delete stayed enabled with nothing selected, and in 3D the next extrusion, which takes the same id, was drawn selected while it was dragged.
