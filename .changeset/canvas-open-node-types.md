---
'@dxos/react-ui-canvas': minor
---

Open the scene engine to host node types (M1): every node is a `NodeBase` with a centre and a size, a `NodeDef` carries its type's schema, `create` and default size, and `createSceneSchema` composes a host's scene schema from its registry. Ports declare what they `accept` (`in`, `out`) and links carry `directed` for an arrowhead. Breaking: the ellipse's `rx`/`ry` became `size`, and the `Node` schema is now `BuiltinNode` (`Node` is the open type).
