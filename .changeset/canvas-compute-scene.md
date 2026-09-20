---
'@dxos/react-ui-canvas-compute': minor
---

The compute shapes on the scene engine (migration M3): `computeNodeDefs` / `computeNodeRegistry` register every shape as a `@dxos/react-ui-canvas/scene` node definition, `createComputeProjection` keeps the compute graph in step with the scene, `Bullets` animates outputs along links, and `sceneFromCircuit` maps a canvas-editor circuit to a scene. `ComputeContext` now carries the shape `registry` (which `Box` reads instead of the editor context), `debug` and `resize`; hosts of the editor path pass their `ShapeRegistry`.
