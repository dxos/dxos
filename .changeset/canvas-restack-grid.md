---
'@dxos/react-ui-canvas-editor': minor
'@dxos/react-ui-canvas-compute': minor
'@dxos/react-ui-canvas': minor
'@dxos/plugin-canvas': minor
'@dxos/diagram': minor
'@dxos/scene': minor
---

A canvas selection can be restacked — `Bring to front` / `Send to back` in the right-click menu and on ⌘] / ⌘[ — and a layer now paints its nodes and links in one order by `z`, so a shape drawn over a link covers it and a link drawn over a shape crosses it, matching what the Views list shows and what a click selects. The selection is no longer raised above its neighbours.

A 2D layout carries a `grid` pitch, which the new `Drawing` inspector section edits along with the lattice, and `DEFAULT_GRID` is 12 (major cell 48). Every default and fixture geometry that was written in 64px cells — shape sizes, layout pitches, the compute shapes and circuits, the `.dx` exemplars — is now expressed in major cells, so it holds whatever the drawing's grid is. ⌘' toggles the background grid, and shape text is 20px.
