---
'@dxos/scene': minor
'@dxos/react-ui-canvas': minor
'@dxos/react-ui-canvas-editor': minor
---

Join and Subtract work on 2D shapes as they do on 3D ones. The `join` and `subtract` layout intents are now valid in a 2D layout (`isLayoutIntent(…, '2d')` accepts them; `extrude` stays 3D only) and make a `solid` element framed by its operands (`solidBounds2D`), which are hidden while it stands and shown again when it is deleted; `solid` is a 2D kind. The 2D viewport draws a solid as the outline its operands make, joined or cut (`solidRings`, `combineRings`, `nodeRings`, `solidPath`, the `solid` node type), worked out as a layout is read and never stored. The two commands are one definition both editors offer (`SOLID_COMMANDS`). `flattenPath` now reads arcs (`A`).

The actions bar no longer has a create menu, and `EditorTools.commands.create` is removed: a shape is made with its tool or dragged from the tools panel.

Hulls nest. Enclosing a selection that holds a hull puts that hull inside the new one with its own shapes (`encloseIn`, `hullDescendants`), where before its shapes were taken from it; shapes of one hull are enclosed inside it. The Hull tool and the actions bar's command (now `Hull`, `scene-action-hull`, where it was Enclose) make a hull by the same operation. Stored, an inner hull's group is a part of the outer hull's group, and `moveToHull` and `viewMove` accept a hull. A hull that names no border is now a box (`DEFAULT_HULL_SHAPE`), where it was a perimeter, so a new hull is a box; a hull stored as `perimeter` is unchanged.
