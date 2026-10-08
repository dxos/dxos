---
'@dxos/react-ui-canvas-compute': minor
---

The compute shapes are scene-engine node types: each shape module exports a `NodeDef` (`gptNodeDef`, `triggerNodeDef`, …, built with `defineComputeNode`), its component takes the engine's view props (`ComputeNodeViewProps`), and its ports come from `createPorts` / `createFunctionPorts`; `computeNodeDefs` and `computeNodeRegistry` are the palette. Breaking: the editor-based `ShapeDef` exports (`gptShape`, …), `computeShapes`, `ComputeShapeLayout`, `useComputeGraphController`, `createFunctionAnchors` and `ComputeContext.registry` are removed — the frame chrome now comes from the registry the scene renders with.
