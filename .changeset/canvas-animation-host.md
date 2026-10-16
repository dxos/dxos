---
'@dxos/react-ui-canvas': minor
'@dxos/plugin-canvas': minor
---

The canvas can host scripted animations: compound objects, an Objects panel, a tilted presentation camera, and read-only per-frame overrides.

- `@dxos/react-ui-canvas`: a frame onto a child scene is a compound object. `ungroupScene` reverses `groupIntoScene` and maps the children onto the frame as it is now (⌘G groups, ⇧⌘G ungroups). Nodes and links take an optional `hidden`. `SceneView.Objects` lists the compound objects as a tree (`compoundTree`); from it you select, frame, enter, rename and hide them, and group or ungroup the selection.
- `@dxos/react-ui-canvas`: `Camera` takes optional `tilt` and `spin` in degrees (`ISOMETRIC_POSE` is 55° and −35°). A tilted or spun view is read-only: a press pans, and nothing selects.
- `@dxos/react-ui-canvas`: `createOverrideStore(store, overrides)` derives each scene from the stored one plus per-frame values (position, size, visibility, style, and a layer's visibility) without writing to the store. `SceneView.Canvas`'s `overlay` draws particles in the camera layer.
- `@dxos/plugin-canvas`: the drawing article docks the Objects panel beside the layers.
