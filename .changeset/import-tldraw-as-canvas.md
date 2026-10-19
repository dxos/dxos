---
'@dxos/plugin-canvas': minor
---

A tldraw drawing can be copied as a canvas: `CanvasOperation.ImportTldraw` maps its shapes to nodes, its arrows to links (bound ends stay attached to their nodes), and its frames to nested scenes, then files the new drawing beside the original and opens it. The action ("Copy as canvas") appears on every tldraw drawing; plugin-tldraw takes no dependency on plugin-canvas. Groups are flattened and rotation is dropped.
