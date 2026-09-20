---
'@dxos/react-ui-canvas': minor
'@dxos/react-ui-canvas-compute': minor
---

Scene engine migration milestones M1 to M3. Open node types: every node is a `NodeBase` with a centre and a size, a `NodeDef` carries its type's schema, `create` and default size, and `createSceneSchema` composes a host's scene schema from its registry. Ports declare what they `accept` (`in`, `out`); links carry `directed` or explicit `ends` markers (arrow, circle), and an endpoint may be a free scene `point`. `NodeStyle` gains `guide` and `className`. Editor parity: hover border, selection painted on top, ghost preview for create drags and palette (pragmatic-dnd) drops, shift-symmetric resize with `maxSize`, alt-subtract marquee, a `debug` atom, the optional `Toolbar` component, and Home. Breaking: the ellipse's `rx`/`ry` became `size`, the `Node` schema is now `BuiltinNode` (`Node` is the open type), and `Endpoint` is a union (`endpointNode` / `isPointEndpoint` narrow it).

The compute shapes on the scene engine: `computeNodeDefs` / `computeNodeRegistry` register every shape as a `@dxos/react-ui-canvas/scene` node definition, `createComputeProjection` keeps the compute graph in step with the scene, `Bullets` animates outputs along links, and `sceneFromCircuit` maps a canvas-editor circuit to a scene. `ComputeContext` now carries the shape `registry` (which `Box` reads instead of the editor context), `debug` and `resize`; hosts of the editor path pass their `ShapeRegistry`.
