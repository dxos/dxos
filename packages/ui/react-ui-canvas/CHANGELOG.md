# @dxos/react-ui-canvas

## 0.13.0

### Minor Changes

- 597cdb7: Add a lattice projection (`createLatticeProjection`): shapes snap to a grid of fixed cells separated by gutters (256x128 cells, 128x64 gutters by default), span any whole number of cells, resize one cell at a time with the opposite face fixed, and preview a move, copy, resize or create onto occupied cells in red before refusing it. Smart links on a lattice route at right angles through the gutters, run straight through free cells, and are nudged into separate lanes where they share a gutter. Route corners share one radius; a link tool click without a drag draws nothing and returns to the select tool; hover clears while dragging; and a link's start and end markers sit side by side in the properties panel. Node types can be declared on prototypes (`createNodeRegistry(types, prototypes)` with `extends`); rectangle and scene share the `box` prototype, and a scene shape now has a centred editable label, a `contents` option (shown by default while it has no label) and a zoom-in control. `nodeDef` moved to its own module so views no longer import the registry. A guides toggle (toolbar, `;`) shows or hides the page frame and the lattice cells. `SceneBuilder` is now declarative: `SceneBuilder.scene(id, [...])` over element factories (`node`, `rect`, `ellipse`, `class`, `note`, `link`) refined with `.properties()`, nested scenes placed with `.at()`, and `build()` returning `{ root, scenes }` checked against the registry's schemas; the chained `create().rect()…` form is removed. Node styles gain a `tone`, 0 to 3 (outline, light, medium, strong; unset is 2), and the properties panel picks hue and tone together from a style grid of swatches (neutral and eight hues by four tones) instead of a hue select. A scene shape drops its fill as soon as it is zoomed into. On a lattice scene a lattice toggle (Shift+G) chooses whether snap lands on the lattice or the basic grid; with snap off placement is free.

### Patch Changes

- Updated dependencies [d2a6aad]
- Updated dependencies [162fd6d]
- Updated dependencies [aad3e41]
- Updated dependencies [44b7b80]
- Updated dependencies [bb2b672]
- Updated dependencies [1ef899b]
- Updated dependencies [5a27d5c]
- Updated dependencies [32f32a0]
- Updated dependencies [469e7f7]
- Updated dependencies [665261a]
- Updated dependencies [234ef9c]
- Updated dependencies [014996b]
- Updated dependencies [22adb53]
- Updated dependencies [2e96a73]
- Updated dependencies [ab1bddf]
- Updated dependencies [ec9f207]
- Updated dependencies [945092e]
- Updated dependencies [c531b05]
- Updated dependencies [eb14798]
- Updated dependencies [3672aff]
- Updated dependencies [2f95d25]
- Updated dependencies [c7cc480]
- Updated dependencies [7d222fc]
- Updated dependencies [161f994]
- Updated dependencies [7a177b9]
- Updated dependencies [246ee3c]
- Updated dependencies [8ebe8d6]
- Updated dependencies [7715216]
- Updated dependencies [1b37aa8]
- Updated dependencies [1737cad]
- Updated dependencies [321c99f]
- Updated dependencies [3d05b7f]
- Updated dependencies [6a7bed4]
- Updated dependencies [3022878]
- Updated dependencies [2550779]
- Updated dependencies [c2a300a]
- Updated dependencies [17008f0]
- Updated dependencies [4f8e566]
- Updated dependencies [a449958]
- Updated dependencies [49731e1]
  - @dxos/react-ui@0.13.0
  - @dxos/echo@0.13.0
  - @dxos/react-ui-form@0.13.0
  - @dxos/diagram@0.13.0
  - @dxos/ui-editor@0.13.0
  - @dxos/react-ui-editor@0.13.0
  - @dxos/effect@0.13.0
  - @dxos/react-hooks@0.13.0
  - @dxos/debug@0.13.0
  - @dxos/ui-theme@0.13.0
  - @dxos/ui-types@0.13.0

## 0.12.0

### Minor Changes

- 6f5c6fc: The scene engine takes open node types and becomes the canvas a host can build on. Every node is a `NodeBase` with a centre and a size; a `NodeDef` carries its type's schema, `create` and default size, and `createSceneSchema` composes a host's scene schema from its registry. Ports declare what they `accept` (`in`, `out`), links carry `directed` or explicit `ends` markers, and an endpoint may be a free scene `point`. A link may also be `smart`: it stores no geometry and routes itself from its ports, so it follows the nodes as they move.

  `SceneView` is a composite. `SceneView.Root` holds the state and is the element gestures land on, and `Canvas`, `Navigation`, `Actions`, `Debug` and `Palette` are parts a host arranges — so a host renders the chrome it wants rather than passing flags for the chrome it does not. Editor parity comes with it: hover borders, selection painted on top, ghost previews for create drags and palette drops, shift-symmetric resize, alt-subtract marquee, auto layout as a `layout` intent the projection answers, and an in-place editor for a node's text parts.

  The compute shapes run on it: `computeNodeDefs` / `computeNodeRegistry` register every shape as a scene node definition, `createComputeProjection` keeps the compute graph in step with the scene, `Bullets` animates outputs along links, and `sceneFromCircuit` maps a canvas-editor circuit to a scene. A board persists through `createEchoStore(board)`, which makes a `CanvasBoard`'s own `layout` the scene store and derives z-order from array order, so a board written by the previous editor opens unchanged.

  Breaking: `SceneView` is a namespace rather than a component — render `SceneView.Root` with the parts a host wants, and pass `liveDepth` and `overlay` to `SceneView.Canvas`; `showToolbar` and `showPalette` are gone with it. An ellipse's `rx`/`ry` became `size`, the `Node` schema is now `BuiltinNode` (`Node` is the open type), `Endpoint` is a union narrowed by `endpointNode` / `isPointEndpoint`, the free-text node type is `note` (leaving `text` to hosts), and `withRegistry` moved from `@dxos/storybook-utils` to `@dxos/react-ui/testing` beside `withTheme` and `withLayout`.

- 119f317: Extract the renderer-neutral scene DSL, dialects, layout engines, diagnostics and SVG content handler from `@dxos/plugin-illustrator/model` into the new `@dxos/diagram` package; the plugin's `model` entry now exports only the ECHO-bound builders (`makeBuilder`, `SvgBuilder`). The DSL gains arrow endpoint ports (`from`/`to` accept `object/element#port`, with `Scene.parseRef` / `Scene.resolveRef`), a `portal` element referencing a nested drawing, and an optional fractional `index` on world objects for z-order.

  Add the scene engine (`@dxos/react-ui-canvas/scene`): an infinite, zoomable canvas of typed nodes (rectangle, ellipse, UML class, text, portal) and links (line, curve, spline) at multiple depths, with drill-in through portals, a projection seam for freehand, constrained and graph-driven layouts, in-place text editing, node styles, undo/redo, cut/copy/paste and a schema-driven properties panel. The private `@dxos/plugin-canvas` contributes it to the illustrator as the `dxos.org/scene/1` drawing variant.

### Patch Changes

- Updated dependencies [6a457ac]
- Updated dependencies [96f94c2]
- Updated dependencies [c020513]
- Updated dependencies [9714c75]
- Updated dependencies [2d58ea5]
- Updated dependencies [bd6ba8e]
- Updated dependencies [5262408]
- Updated dependencies [d194929]
- Updated dependencies [557e243]
- Updated dependencies [cff33b7]
- Updated dependencies [5dc2419]
- Updated dependencies [a09e18e]
- Updated dependencies [b63506b]
- Updated dependencies [6af89f4]
- Updated dependencies [d770fe7]
- Updated dependencies [ab56cfe]
- Updated dependencies [119f317]
- Updated dependencies [18758f9]
- Updated dependencies [7ec1738]
- Updated dependencies [df295b2]
- Updated dependencies [2e4c299]
- Updated dependencies [4800a6f]
- Updated dependencies [1b62726]
- Updated dependencies [5b99c47]
- Updated dependencies [bd792a6]
- Updated dependencies [8608f03]
- Updated dependencies [813069c]
- Updated dependencies [9d0132f]
- Updated dependencies [098a0bb]
- Updated dependencies [41e2750]
- Updated dependencies [818a096]
- Updated dependencies [557e243]
- Updated dependencies [29543ca]
- Updated dependencies [08cddf6]
- Updated dependencies [a04ab6e]
- Updated dependencies [77a2d34]
- Updated dependencies [d4b4919]
- Updated dependencies [ec4f4ca]
- Updated dependencies [d1a69fb]
- Updated dependencies [0a3e9dd]
- Updated dependencies [e2b04f6]
- Updated dependencies [306f50d]
- Updated dependencies [b7822a7]
- Updated dependencies [c8b65f3]
- Updated dependencies [9feee5e]
- Updated dependencies [f2d8a92]
- Updated dependencies [d005fd9]
- Updated dependencies [0e44f24]
- Updated dependencies [cef0a3b]
- Updated dependencies [bd06669]
- Updated dependencies [1d6f730]
- Updated dependencies [ca04eca]
- Updated dependencies [fc83abd]
- Updated dependencies [178bc6d]
- Updated dependencies [58b59d7]
- Updated dependencies [8904184]
- Updated dependencies [e680b16]
- Updated dependencies [a805212]
- Updated dependencies [6fed038]
- Updated dependencies [56276cd]
- Updated dependencies [6a1ec57]
- Updated dependencies [82a9c4e]
- Updated dependencies [e3d7a8c]
- Updated dependencies [32584c9]
- Updated dependencies [631df48]
- Updated dependencies [928e0b2]
- Updated dependencies [4c5b2c7]
- Updated dependencies [f9816c0]
- Updated dependencies [6fd2a5d]
- Updated dependencies [525aee0]
- Updated dependencies [f112c37]
- Updated dependencies [8048e42]
- Updated dependencies [520c34f]
- Updated dependencies [b2a44d6]
- Updated dependencies [77d0026]
- Updated dependencies [78433b0]
- Updated dependencies [77976e4]
- Updated dependencies [e0a9adb]
- Updated dependencies [f99a6e9]
  - @dxos/ui-theme@0.12.0
  - @dxos/react-ui@0.12.0
  - @dxos/ui-editor@0.12.0
  - @dxos/react-ui-form@0.12.0
  - @dxos/diagram@0.12.0
  - @dxos/react-ui-editor@0.12.0
  - @dxos/ui-types@0.12.0
  - @dxos/debug@0.12.0
  - @dxos/react-hooks@0.12.0

## 0.11.1

### Patch Changes

- @dxos/debug@0.11.1
- @dxos/invariant@0.11.1
- @dxos/log@0.11.1
- @dxos/util@0.11.1

## 0.11.0

### Patch Changes

- Updated dependencies [e0e1a9f]
- Updated dependencies [ed992c2]
- Updated dependencies [ed992c2]
- Updated dependencies [3f1fc67]
- Updated dependencies [2fe5a7a]
- Updated dependencies [d958118]
- Updated dependencies [e65432c]
- Updated dependencies [f6a01e3]
- Updated dependencies [c9651f1]
- Updated dependencies [717edc0]
- Updated dependencies [51aaffe]
- Updated dependencies [37874ce]
- Updated dependencies [848ba1b]
- Updated dependencies [55bb048]
- Updated dependencies [4df6cf3]
- Updated dependencies [ed992c2]
- Updated dependencies [ed992c2]
- Updated dependencies [c58ebb7]
  - @dxos/react-ui@0.11.0
  - @dxos/util@0.11.0
  - @dxos/ui-theme@0.11.0
  - @dxos/log@0.11.0
  - @dxos/debug@0.11.0
  - @dxos/invariant@0.11.0
