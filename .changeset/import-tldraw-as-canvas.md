---
'@dxos/plugin-canvas': minor
'@dxos/react-ui-canvas': patch
---

A tldraw drawing can be copied as a canvas: `CanvasOperation.ImportTldraw` maps its shapes to nodes, its arrows to links (bound ends stay attached to their nodes), and its frames to View nodes over Views of their own and its groups to anonymous Objects, then files the new drawing beside the original and opens it. The action ("Copy as canvas") appears on every tldraw drawing; plugin-tldraw takes no dependency on plugin-canvas. Rotation carries over; tldraw's clouds and regular polygons map to the canvas's own, and the shapes it has no match for become rectangles. `@dxos/react-ui-canvas/headless` now exports `composeSelection` and the other pure grouping helpers, so a host can group nodes without loading React.
