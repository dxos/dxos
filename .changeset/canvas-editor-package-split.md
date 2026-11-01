---
'@dxos/react-ui-canvas': minor
'@dxos/plugin-canvas': minor
'@dxos/app-framework': minor
---

Breaking: the scene UI is now `@dxos/react-ui-canvas` (the 2D and 3D surface, with `/3d`, `/io` and `/headless` entries) and the new `@dxos/react-ui-canvas-editor` (`SceneEditor`: one editor for both dimensions, with its tool rail, actions bar, display panel, inspectors and Timeline); `@dxos/react-ui-scene` and `@dxos/plugin-spacetime` are removed, and `@dxos/scene`, `@dxos/animation`, `@dxos/react-ui-animation` and `@dxos/plugin-animator` are now public. `@dxos/plugin-canvas` moves legacy scene drawings onto `Canvas` objects when a space loads and draws them in both dimensions: a 3D canvas places primitives and meshes, joins, subtracts and extrudes solids, imports OBJ and GLB and exports STL, and its rail's Library tool inserts the bundled race car, fire engine and taxi (plugins add more through `CanvasCapabilities.LibraryItem`); a Neu shape with no hue draws as Neutral, and a canvas embedded in markdown takes a 16:9 height and opens fitted.

An object opened outside any collection (`…/db/<type>+<id>`) resolves again, as the app graph no longer wraps a type node's schema in an action forwarder, and an object in a nested collection is addressed as `object/<id>`.

`Surface.useContributions(role)` subscribes a component to a role's contributed surfaces, so a check made with `Surface.useIsAvailable` is repeated once a module loaded on demand contributes; a markdown embed uses it, and no longer stays blank when its preview's surface module loads after the embed first renders.
