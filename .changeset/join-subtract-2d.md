---
'@dxos/scene': minor
'@dxos/react-ui-canvas': minor
'@dxos/react-ui-canvas-editor': minor
---

Join and Subtract work on 2D shapes as they do on 3D ones. The `join` and `subtract` layout intents are now valid in a 2D layout (`isLayoutIntent(…, '2d')` accepts them; `extrude` stays 3D only) and make a `solid` element framed by its operands (`solidBounds2D`), which are hidden while it stands and shown again when it is deleted; `solid` is a 2D kind. The 2D viewport draws a solid as the outline its operands make, joined or cut (`solidRings`, `combineRings`, `nodeRings`, `solidPath`, the `solid` node type), worked out as a layout is read and never stored. The two commands are one definition both editors offer (`SOLID_COMMANDS`). `flattenPath` now reads arcs (`A`).
