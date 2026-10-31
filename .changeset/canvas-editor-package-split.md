---
'@dxos/react-ui-canvas': minor
'@dxos/plugin-canvas': minor
---

The scene UI is now two packages: `@dxos/react-ui-canvas` is the 2D and 3D surface (with `/3d`, `/io` and `/headless` entries), and the new public `@dxos/react-ui-canvas-editor` is the editor (`SceneEditor`, panels, inspectors, tools), with breadcrumbs, drill-in to nested frames, Neu Light and Neu Dark themes, and a Timeline hidden until toggled; `@dxos/scene` is now public. Breaking: `@dxos/react-ui-scene` is removed, and plugin-canvas migrates legacy scene drawings onto `Canvas` objects when a space loads and drops its legacy canvas surfaces; `@dxos/plugin-canvas/Architecture` now exports `canvasDrawingSchemas`, `loadDrawingCanvas`, `readDrawingContent` and `editDrawingContent`. The Create Drawing dialog now lists every installed renderer the first time it opens, not only svg.
