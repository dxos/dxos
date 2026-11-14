# @dxos/react-ui-canvas-compute

## 0.17.0

### Minor Changes

- c1c6cf4: Breaking: the scene container is renamed View across the API — `SceneId` → `ViewId`, `SceneStore` → `ViewStore`, `SceneKind` → `ViewKind`, `Scene` → `View`, `SceneBuilder` → `ViewBuilder`, `useSceneProjection` → `useViewProjection`, the store's `scenes`/`scene(id)` → `views`/`view(id)` — and the `frame` node type is now `view` (`FrameNode` → `ViewNode`, `isFrameNode` → `isViewNode`); stored `frame` nodes load as `view`. react-ui-canvas-compute and plugin-canvas follow (`boardSceneId` → `boardViewId`, `readScenes`/`writeScenes` → `readViews`/`writeViews`, `ROOT_SCENE_ID` → `ROOT_VIEW_ID`, `DYNAMIC_SCENE_ID` → `DYNAMIC_VIEW_ID`).

  The canvas's commands live in a React-free `CanvasController` (`createCanvasController`), organised by aspect (selection, editing, tools, time, navigation, look), and its parts read their own state, so panning or a selection change no longer re-renders panels that do not show it. A read-only canvas pastes, cuts and deletes nothing.

  The new `Canvas.Views` panel shows the drawing's Views, nodes, links and placed Objects as a tree: a row selects on the canvas (opening an Object in isolation for its contents), the root row selects everything, a double-click opens a View, a drag restacks siblings, and a filter narrows the rows. Group (⌘G) makes an anonymous Object and one Instance in place of the selection, which joins the Objects library once named or placed again; Ungroup (⇧⌘G) puts it back. `groupIntoView` and the Compose button are removed, and deleting the last node that opens a View or an anonymous Object deletes that record, as stores do on load (`createMemoryStore`'s `root` option, plugin-canvas on bind).

  The inspector panel shows the same sections docked or floating, Properties above a draggable seam and the rest below (`InspectorSectionDef.pane`; `InspectorSectionDef.show` and `InspectorPanel.Root`'s `selected` are removed); selection actions sit in its toolbar (`InspectorPanel.Root` `actions`). New shapes: `cloud` (key C, with a bump count) and a regular `polygon` (key N, with a side count), drawn through `NodeDef.silhouette`; every node takes a `rotation` in 15° steps. The timeline's key actions move into one menu, and the scene-tree fixtures move from `builder/testing` to `testing`.

- 10a11da: A canvas selection can be restacked — `Bring to front` / `Send to back` in the right-click menu and on ⌘] / ⌘[ — and a layer now paints its nodes and links in one order by `z`, so a shape drawn over a link covers it and a link drawn over a shape crosses it, matching what the Views list shows and what a click selects. The selection is no longer raised above its neighbours.

  A 2D layout carries a `grid` pitch, which the new `Drawing` inspector section edits along with the lattice, and `DEFAULT_GRID` is 12 (major cell 48). Every default and fixture geometry that was written in 64px cells — shape sizes, layout pitches, the compute shapes and circuits, the `.dx` exemplars — is now expressed in major cells, so it holds whatever the drawing's grid is. ⌘' toggles the background grid, and shape text is 20px.

- b0113a1: Composite objects whose parts follow their frame, declared in the scene DSL.

  A part of a composite can now say, per axis, which of its edges follow the frame
  (`constrain` over `min | max | stretch | center | scale`), so an Object drawn at
  another size lays itself out instead of scaling like a picture — a card's footer
  stays on its floor and its body grows. A tool declares its shape as DSL source
  (`composite <id> { element … }`) rather than painting it in a React view, and
  every shape that tool draws is an Instance of one definition, so restyling any
  of them reaches them all while each one's text stays its own.

  A part may be `optional`: it is switched off for one Instance from the Properties
  panel, the part naming it in `grow` takes its room, and a part that `follows`
  another goes with it — so a card without a footer is the same Object as a card
  with one, not a second definition. A part `bind`s to any field of the Instance,
  not only text, so a card's glyph is its own typed `icon`. A `polyline` part
  authors its vertices in the DSL (`points="0,0.5 1,0.5"`), as fractions of its own
  frame, so a template can draw a rule that stretches with the shape it is in.

  Double-clicking an Object now edits it where it stands: its parts become what the
  editor acts on and the drawing around them fades, as 3D already did. Links gain
  an `ortho` variant and the Properties panel a Variant selector (straight,
  orthogonal, elbow, curve, spline).

  The built-in Card and the UML class are composites themselves: each declares its
  template and places an Instance of it, so its regions are parts in the Views tree,
  edited in place, with the data still typed on the shape.
  `@dxos/react-ui-canvas-editor` gains a `./testing` entry point so a plugin's own
  kind can be rendered through the shared editor in a story.

  Cards, text shapes and gestures also sit on the canvas's own grid:

  - `card` and `icon` are built-in node types. A card is a glyph and a title, a body, and a footer over
    a hairline, each edited in place; an icon is any Phosphor glyph at any of its six weights. The
    `card` and `icon` prototypes remain for a contributed kind that paints a view of its own.
  - A gesture lands on the finest grid level drawn rather than the major one, so a shape can be placed a
    cell from its neighbour and lands on the lines under the pointer. `SceneSnap.snapMinor` is gone:
    `snap` is that function now.
  - A move draws the box it will land in, not only when the drop would be refused.
  - The text node (`note`) draws no fill, border or radius of its own, and `padding` is a property of
    the two types that draw text in a box — the rectangle and the text node — defaulting to the minor
    grid cell it was hardcoded to.
  - Default and minimum sizes are whole numbers of grid cells: a rectangle is 4 x 2 nominal units and a
    card 4 x 3, and an ellipse resizes down to a quarter unit.

  Hulls: a border round a set of shapes, which a link's route respects.

  - The Hull tool drags a frame that takes the shapes inside it, and Enclose draws a hull round the selection. A hull's
    Hull property is `perimeter` (round the shapes) or `box` (the rectangle that bounds them); its frame follows
    whatever is inside it, moving it moves them, and it is styled as any shape is.
  - A hull is stored as a group: an Instance with `hull` set over an anonymous composite of its shapes, as the Group
    command makes one. The 2D editor draws that group opened out, so a shape inside a hull is selected, moved and
    linked directly.
  - On a lattice the border runs along the gutters, and an elbow link keeps to the side of it both its ends are on: a
    link between two shapes inside stays inside, one from outside crosses the border once, and one between two shapes
    outside goes round the hull.
  - The lattice no longer snaps a composite's parts, which are placed about the composite's own centre.
  - In the Views inspector a hull's shapes are rows under it, and a row dragged onto a hull, or beside a row of
    another hull or of none, moves its shape into, between or out of hulls.

  The display panel's grid switch on a lattice scene can be turned off: pressing the option that is drawn (its cells,
  or the grid) draws neither, as pressing dots or lines already did elsewhere. A lattice scene draws no grid when the
  look has none.

  A link's free end is drawn where it will land while it is dragged: on the port or node under the pointer, else on
  the grid. An orthogonal link with a free end keeps its corner on one side of the line while that end is dragged,
  rather than jumping across it at the diagonal.

  An elbow link to an end on no port turns twice, halfway between its ends, on a lattice scene too, where it used to
  follow the nearest gutter line. The Properties panel's Type field now changes how a link is drawn: it was refused by
  the form and ignored by the edit behind it. A form field's error icon shows the error in a tooltip.

  The Drawing section's Cell and Gutter are whole counts of grid cells: the lattice stored is the counts times the grid
  size, so a new grid size rescales it. Turning the lattice off and on again brings back the lattice the drawing had.
  A lattice that changes size keeps every shape on the cells it had, the shapes inside a hull included: the lattice mode
  re-seats a layout's shapes when a `layout` intent writes a new lattice.

  A hull has an `inset`: a whole number of grid cells its border is drawn inside its line. On a lattice the line is the
  centre of the gutter, which the inset leaves clear, and a link inside the hull runs between the border and the shapes;
  off a lattice the inset comes off the margin. A link outside an inset hull runs along the gutter's centre line, as it
  would with no hull there. `fitHulls`, `hullOutline` and `enclose` take the grid pitch, and `gridPitch` is the one rule
  for the pitch a drawing is on. The Properties panel shows a hull's border and inset side by side.

  The default lattice's gutter is 8 by 8 grid cells (128 by 128 px, where it was 128 by 64). A drawing put on the
  default lattice from now on takes the new one; a drawing already on a lattice keeps its own. plugin-canvas's
  reference diagrams are drawn on it: their `.dx` sources name `grid=384x256`, and their compiled commands and SVG
  renders are regenerated.

  plugin-canvas contributes its own extension tools through `CanvasCapabilities.NodeType`, the space graph first: one
  ECHO space as a circle of objects on a hexagonal lattice, with its seed, spacing and hue as Properties. The tools
  panel has two more groups after the shapes: `Containers` (the hull and the view) and `Extensions` (the card, and
  every kind a plugin contributes unless it names a group of its own, so plugin-uml's class is there too);
  react-ui-canvas exports `CONTAINERS_GROUP` and `EXTENSIONS_GROUP`.

  An extension kind keeps its own fields under its element's `data`, not at the element's top
  (`Schema.Struct({ ...Scene.Element2D.fields, type, data: Schema.Struct({ … }) })`), so a kind's field never meets the
  base's or another kind's; `Scene.BaseElement` gains the `data` slot. The engine's node carries the same `data`: a
  view reads it with `kindData(schema, node)`, a part or a bind names a field as `data.<field>`, and the Properties
  panel shows it last, as a group labelled `Custom`. `kindNodeDef` refuses a kind that declares a field of its own at the
  top, unless it extends a core prototype whose frame reads fields there (a card's `icon`, `body`, `footer`).
  `KindRegistry` gains `dataFields(type)` and `normalize(element)`. **Migration:** move a kind's own fields into
  `data` in its schema, its `create`, its view, and its `parts` / `fields` / template `bind` names. A stored element
  with the fields at its top is read as before and written back under `data` on its next edit. plugin-uml's class
  keeps `attributes` and `methods` in `data`.

  Conductor's compute shapes follow the same rule in a board's stored shape, its scene element and the engine's node:
  the compute `node` id and each shape's own fields (a constant's `value`, a template's `valueType`, a random number's
  `min` and `max`, a trigger's `functionTrigger`) are under `data`. **Migration:** pass a shape's own fields to its
  factory under `data` (`createConstant({ data: { value } })`) and read them from `shape.data`; a board stored with
  the fields beside the shape's own opens as before and is rewritten on its next edit.

  The space graph's Properties are two to a row; Population is Node density, and Base dots (off unless turned on) draws
  the lattice points that hold no object.

  A link's elbows are sized by the drawing's grid: a corner is cut one grid cell back, a smart link's stub leaves its
  port by half a major cell, and lanes sharing a gutter are a cell apart, where each was a fixed length of the default
  grid. `linkGeometry`, `viewLinkGeometry`, `linkPath`, `smartPoints` and `splinePath` take the grid as a last
  argument (the default grid when left out), and `ControlFrame` a `grid` prop.

  A port is the same size on screen at any zoom, as a resize handle is; it grew with the drawing, and covered a
  zoomed-in shape. A selected shape drawn too small for its resize handles (under 40 px on its shorter side) shows
  its outline alone, where the handles overlapped and hid it; `handlesFit(bounds, zoom)` is the rule. The Properties
  panel shows a part selected inside an Object that is being edited in place, where it
  showed nothing selected.

  The card is authored at the size the tool draws it (16 by 12 grid cells, `CARD_SIZE`): a two-cell glyph, the title
  half a cell beside it, the body half a cell under the header, and a two-cell footer half a cell under the body and
  half a cell off the floor. Its text has sizes of its own (title 18, body 16, footer 14) and its glyph is 24 px. The
  scene DSL reads and prints a 2D element's text size (`fontSize=18`), and an icon node with a `fontSize` in its style
  draws its glyph at that size, where it took 70% of its frame. plugin-canvas's space graph component is `Graph`
  (`graphSpec`, `GraphNode`, `GraphData`), its tool named Graph; the element type is still `space-graph`.

  A Draw tool (S), after Polyline in the tools panel, draws a line in one stroke: it samples the pointer while
  the button is down and lands the stroke as a polyline run as a curve through a few of the samples
  (`PolylineParams.smooth`, also a switch in Properties; `simplifyPath`; `NodeDef.freehand`). The tool stays in hand for
  the next stroke, and a stroke begun on a shape is drawn over it. The card's title is centred beside its glyph; the
  scene DSL also reads `alignHorizontal` and `alignVertical`.

  A form field with no value shows the default its schema declares (Effect's `default` annotation,
  `Schema.Number.annotate({ default: 26 })`) as its value. Showing it writes nothing: the form holds no value for the
  field until it is edited. The space graph declares its defaults this way, so the Properties panel and the drawing
  agree on an unset field.

  The Properties panel shows a shape selected inside a hull, where it showed nothing selected.

  A switch or checkbox keeps its visually hidden input inside itself (`position: relative` on `.dx-switch` and
  `.dx-checkbox`): in a scrolling form the input was left behind, and focusing it scrolled a clipped ancestor, which took
  the Properties panel out of view when a toggle far down it was pressed. The Properties panel shows Fill and Border as
  a shape draws them, so a type that draws all it shows (text, an icon) reads off until one is asked for. A node type
  may be an `outline` (`NodeDefSpec.outline`): its border is the frame's and is on, with no fill unless asked for one.
  Being part of the drawing, an outline keeps its colour while the node is selected or hovered; the selection frame
  alone marks it. The space graph is one, so its ring is its Border, and turning it off or on moves nothing inside it.
  A vector field's stack no longer asks a plain fieldset for a gutter, which logged a warning.

  `@dxos/ui-types/phosphor` exports `phosphorIcons`, the name of every regular Phosphor glyph. It is an entry of its
  own rather than part of the package's index, and `iconOptions()` imports it when a picker first asks, so the
  catalogue is not downloaded with the app.

  A double-click off an Object being edited leaves it. The Card tool's icon is `ph--article`.

  A `diagram` fence in a markdown document draws as a diagram, in the editor's light or dark palette:
  `SvgFile.toSvgFile` takes `{ theme, transparent }`, `diagramPreview()` follows the editor's colour mode, and
  plugin-canvas contributes it to the markdown editor.

### Patch Changes

- Updated dependencies [c9a38c1]
- Updated dependencies [b6d1c9c]
- Updated dependencies [90a7f6e]
- Updated dependencies [c1f845f]
- Updated dependencies [9cb96c7]
- Updated dependencies [812ae94]
- Updated dependencies [cb058b9]
- Updated dependencies [73ed632]
- Updated dependencies [710da43]
- Updated dependencies [5ee83e7]
- Updated dependencies [a761a74]
- Updated dependencies [c1c6cf4]
- Updated dependencies [a5742a9]
- Updated dependencies [cab57d0]
- Updated dependencies [a349ae0]
- Updated dependencies [df16fba]
- Updated dependencies [40271d5]
- Updated dependencies [e82b80a]
- Updated dependencies [9b2b0fe]
- Updated dependencies [10a11da]
- Updated dependencies [6eb0aae]
- Updated dependencies [e8029c3]
- Updated dependencies [81d2cd2]
- Updated dependencies [f142d06]
- Updated dependencies [d8b13ad]
- Updated dependencies [1924a44]
- Updated dependencies [7a8b279]
- Updated dependencies [b0113a1]
- Updated dependencies [e343467]
- Updated dependencies [9a3313a]
- Updated dependencies [034e231]
- Updated dependencies [498840b]
- Updated dependencies [0590c11]
- Updated dependencies [9fe0e5c]
- Updated dependencies [08f8784]
- Updated dependencies [d45bf58]
- Updated dependencies [f82b258]
- Updated dependencies [94df7d2]
- Updated dependencies [aec19dd]
- Updated dependencies [a70fb5a]
- Updated dependencies [f7e965a]
- Updated dependencies [2f78880]
- Updated dependencies [9bcc167]
- Updated dependencies [b3a41d3]
- Updated dependencies [0737c44]
- Updated dependencies [908c301]
- Updated dependencies [78e96da]
- Updated dependencies [f37ae92]
- Updated dependencies [3aef671]
- Updated dependencies [df1380a]
- Updated dependencies [13bc40d]
- Updated dependencies [a1c19cc]
- Updated dependencies [59b9d5a]
- Updated dependencies [7751052]
- Updated dependencies [545ee73]
- Updated dependencies [2bba392]
- Updated dependencies [9d66bcd]
- Updated dependencies [592fdad]
- Updated dependencies [49df146]
- Updated dependencies [a18cb35]
- Updated dependencies [6030742]
- Updated dependencies [6ba7a88]
- Updated dependencies [074e3e6]
- Updated dependencies [05e0b67]
- Updated dependencies [17a9e75]
- Updated dependencies [b46d89b]
- Updated dependencies [853663c]
- Updated dependencies [1f73ed2]
- Updated dependencies [691fe84]
- Updated dependencies [09d8716]
- Updated dependencies [a843e27]
- Updated dependencies [27b3290]
- Updated dependencies [45e1c93]
- Updated dependencies [03ee407]
- Updated dependencies [6fd1079]
- Updated dependencies [2d585c2]
- Updated dependencies [0166448]
- Updated dependencies [392bed0]
- Updated dependencies [34643a3]
- Updated dependencies [f86f10e]
- Updated dependencies [c9c3867]
- Updated dependencies [80818bc]
- Updated dependencies [aedf119]
- Updated dependencies [80c25fe]
- Updated dependencies [20a14b9]
- Updated dependencies [5970ed3]
- Updated dependencies [b8cc7e7]
- Updated dependencies [e99e717]
- Updated dependencies [bc5cea7]
- Updated dependencies [aa1cde1]
- Updated dependencies [4fe25ee]
- Updated dependencies [f175a2d]
- Updated dependencies [ed0d367]
- Updated dependencies [2cebedc]
- Updated dependencies [7da5d17]
- Updated dependencies [8d7d5e1]
- Updated dependencies [4be51c3]
- Updated dependencies [f299590]
- Updated dependencies [ca2a4a8]
- Updated dependencies [02254b0]
- Updated dependencies [85131cc]
- Updated dependencies [bf1dc0c]
- Updated dependencies [7e07e49]
- Updated dependencies [b159f41]
- Updated dependencies [3b37cd1]
- Updated dependencies [bdb73fb]
- Updated dependencies [39f6b21]
- Updated dependencies [a8e68c5]
- Updated dependencies [8a66e4e]
- Updated dependencies [8e2f718]
- Updated dependencies [d00cc85]
- Updated dependencies [0a14251]
- Updated dependencies [768db81]
- Updated dependencies [841c4f7]
- Updated dependencies [10b3963]
- Updated dependencies [1a0fff1]
- Updated dependencies [901c1e4]
- Updated dependencies [e67aa80]
- Updated dependencies [e50d1e5]
- Updated dependencies [df65316]
  - @dxos/types@0.17.0
  - @dxos/app-toolkit@0.17.0
  - @dxos/echo@0.17.0
  - @dxos/react-ui@0.17.0
  - @dxos/compute@0.17.0
  - @dxos/ui-editor@0.17.0
  - @dxos/app-framework@0.17.0
  - @dxos/react-ui-canvas@0.17.0
  - @dxos/scene@0.17.0
  - @dxos/react-ui-editor@0.17.0
  - @dxos/react-ui-canvas-editor@0.17.0
  - @dxos/context@0.17.0
  - @dxos/ai@0.17.0
  - @dxos/keys@0.17.0
  - @dxos/react-ui-syntax-highlighter@0.17.0
  - @dxos/util@0.17.0
  - @dxos/react-ui-experimental@0.17.0
  - @dxos/async@0.17.0
  - @dxos/conductor@0.17.0
  - @dxos/echo-react@0.17.0
  - @dxos/react-client@0.17.0
  - @dxos/react-ui-audio@0.17.0
  - @dxos/ui-theme@0.17.0
  - @dxos/effect@0.17.0
  - @dxos/graph@0.17.0
  - @dxos/log@0.17.0
  - @dxos/debug@0.17.0
  - @dxos/invariant@0.17.0

## 0.16.0

### Patch Changes

- Updated dependencies [4be32be]
- Updated dependencies [67f3f9f]
- Updated dependencies [dc7785a]
- Updated dependencies [2f76f26]
  - @dxos/react-ui-canvas@0.16.0
  - @dxos/react-ui@0.16.0
  - @dxos/echo@0.16.0
  - @dxos/react-client@0.16.0
  - @dxos/app-framework@0.16.0
  - @dxos/app-toolkit@0.16.0
  - @dxos/react-ui-audio@0.16.0
  - @dxos/react-ui-editor@0.16.0
  - @dxos/react-ui-experimental@0.16.0
  - @dxos/react-ui-syntax-highlighter@0.16.0
  - @dxos/compute@0.16.0
  - @dxos/conductor@0.16.0
  - @dxos/echo-react@0.16.0
  - @dxos/types@0.16.0
  - @dxos/ui-editor@0.16.0
  - @dxos/ai@0.16.0
  - @dxos/async@0.16.0
  - @dxos/context@0.16.0
  - @dxos/debug@0.16.0
  - @dxos/effect@0.16.0
  - @dxos/graph@0.16.0
  - @dxos/invariant@0.16.0
  - @dxos/keys@0.16.0
  - @dxos/log@0.16.0
  - @dxos/util@0.16.0
  - @dxos/ui-theme@0.16.0

## 0.15.0

### Patch Changes

- Updated dependencies [3b03db7]
- Updated dependencies [0a55936]
- Updated dependencies [3d151fc]
- Updated dependencies [311d611]
- Updated dependencies [008b18c]
- Updated dependencies [ab27b41]
- Updated dependencies [9b2a2c0]
- Updated dependencies [94ec06d]
- Updated dependencies [419bf9a]
- Updated dependencies [3aed53a]
- Updated dependencies [ed8df23]
- Updated dependencies [0f6457d]
- Updated dependencies [94d4f85]
- Updated dependencies [b6ae19d]
- Updated dependencies [b82150a]
- Updated dependencies [cd70a43]
- Updated dependencies [0d81167]
- Updated dependencies [71fc002]
- Updated dependencies [1e9c017]
- Updated dependencies [1b33a84]
- Updated dependencies [16bde33]
- Updated dependencies [1bc475e]
- Updated dependencies [d250ed2]
- Updated dependencies [55bdf55]
- Updated dependencies [9b9a4ca]
- Updated dependencies [94fb343]
- Updated dependencies [098a536]
- Updated dependencies [25af912]
- Updated dependencies [7b47951]
- Updated dependencies [8190cc5]
- Updated dependencies [60ef4ec]
- Updated dependencies [2b6a93a]
  - @dxos/ui-editor@0.15.0
  - @dxos/react-ui-canvas@0.15.0
  - @dxos/react-ui@0.15.0
  - @dxos/echo@0.15.0
  - @dxos/compute@0.15.0
  - @dxos/app-framework@0.15.0
  - @dxos/ai@0.15.0
  - @dxos/async@0.15.0
  - @dxos/react-ui-editor@0.15.0
  - @dxos/app-toolkit@0.15.0
  - @dxos/echo-react@0.15.0
  - @dxos/conductor@0.15.0
  - @dxos/react-client@0.15.0
  - @dxos/react-ui-audio@0.15.0
  - @dxos/react-ui-experimental@0.15.0
  - @dxos/react-ui-syntax-highlighter@0.15.0
  - @dxos/types@0.15.0
  - @dxos/effect@0.15.0
  - @dxos/graph@0.15.0
  - @dxos/util@0.15.0
  - @dxos/context@0.15.0
  - @dxos/debug@0.15.0
  - @dxos/invariant@0.15.0
  - @dxos/keys@0.15.0
  - @dxos/log@0.15.0
  - @dxos/ui-theme@0.15.0

## 0.14.0

### Patch Changes

- Updated dependencies [0715304]
- Updated dependencies [b0e4b60]
- Updated dependencies [fd09131]
- Updated dependencies [508be04]
- Updated dependencies [929d683]
- Updated dependencies [347546a]
- Updated dependencies [8bd0c5b]
- Updated dependencies [30b3bd3]
- Updated dependencies [3c4d73d]
- Updated dependencies [ec6da5a]
- Updated dependencies [a1e64db]
- Updated dependencies [28bb45b]
- Updated dependencies [b06ee26]
- Updated dependencies [1eed6b1]
- Updated dependencies [6847fe2]
- Updated dependencies [1819960]
- Updated dependencies [eb5d14d]
- Updated dependencies [5324de6]
- Updated dependencies [b07f49f]
  - @dxos/app-framework@0.14.0
  - @dxos/react-ui-canvas@0.14.0
  - @dxos/react-ui@0.14.0
  - @dxos/compute@0.14.0
  - @dxos/echo@0.14.0
  - @dxos/effect@0.14.0
  - @dxos/ui-theme@0.14.0
  - @dxos/conductor@0.14.0
  - @dxos/app-toolkit@0.14.0
  - @dxos/react-ui-experimental@0.14.0
  - @dxos/react-client@0.14.0
  - @dxos/react-ui-audio@0.14.0
  - @dxos/react-ui-editor@0.14.0
  - @dxos/react-ui-syntax-highlighter@0.14.0
  - @dxos/ai@0.14.0
  - @dxos/echo-react@0.14.0
  - @dxos/types@0.14.0
  - @dxos/ui-editor@0.14.0
  - @dxos/graph@0.14.0
  - @dxos/async@0.14.0
  - @dxos/context@0.14.0
  - @dxos/debug@0.14.0
  - @dxos/invariant@0.14.0
  - @dxos/keys@0.14.0
  - @dxos/log@0.14.0
  - @dxos/util@0.14.0

## 0.13.0

### Patch Changes

- Updated dependencies [bbe9f18]
- Updated dependencies [d2a6aad]
- Updated dependencies [162fd6d]
- Updated dependencies [aad3e41]
- Updated dependencies [597cdb7]
- Updated dependencies [bb2b672]
- Updated dependencies [c6922ce]
- Updated dependencies [cb1e218]
- Updated dependencies [1ef899b]
- Updated dependencies [1b2e9f3]
- Updated dependencies [5a27d5c]
- Updated dependencies [32f32a0]
- Updated dependencies [dc16fdd]
- Updated dependencies [469e7f7]
- Updated dependencies [665261a]
- Updated dependencies [68dc875]
- Updated dependencies [2e96a73]
- Updated dependencies [945092e]
- Updated dependencies [c531b05]
- Updated dependencies [3672aff]
- Updated dependencies [2f95d25]
- Updated dependencies [69a4a85]
- Updated dependencies [c7cc480]
- Updated dependencies [7d222fc]
- Updated dependencies [e99ee70]
- Updated dependencies [161f994]
- Updated dependencies [ff92c50]
- Updated dependencies [3e73e53]
- Updated dependencies [9ab98cd]
- Updated dependencies [8fc641a]
- Updated dependencies [38e2ddb]
- Updated dependencies [1894fc1]
- Updated dependencies [246ee3c]
- Updated dependencies [8ebe8d6]
- Updated dependencies [596728d]
- Updated dependencies [7715216]
- Updated dependencies [1b37aa8]
- Updated dependencies [1737cad]
- Updated dependencies [321c99f]
- Updated dependencies [6a7bed4]
- Updated dependencies [3022878]
- Updated dependencies [c2a300a]
- Updated dependencies [17008f0]
- Updated dependencies [6ea9d4d]
- Updated dependencies [dde8f43]
- Updated dependencies [4f8e566]
- Updated dependencies [fcbb5c4]
- Updated dependencies [a449958]
- Updated dependencies [49731e1]
  - @dxos/compute@0.13.0
  - @dxos/react-ui@0.13.0
  - @dxos/echo@0.13.0
  - @dxos/react-ui-canvas@0.13.0
  - @dxos/ai@0.13.0
  - @dxos/util@0.13.0
  - @dxos/types@0.13.0
  - @dxos/app-toolkit@0.13.0
  - @dxos/app-framework@0.13.0
  - @dxos/conductor@0.13.0
  - @dxos/react-client@0.13.0
  - @dxos/react-ui-audio@0.13.0
  - @dxos/react-ui-canvas-editor@0.13.0
  - @dxos/react-ui-experimental@0.13.0
  - @dxos/react-ui-syntax-highlighter@0.13.0
  - @dxos/echo-react@0.13.0
  - @dxos/async@0.13.0
  - @dxos/context@0.13.0
  - @dxos/effect@0.13.0
  - @dxos/graph@0.13.0
  - @dxos/log@0.13.0
  - @dxos/debug@0.13.0
  - @dxos/invariant@0.13.0
  - @dxos/keys@0.13.0
  - @dxos/ui-theme@0.13.0

## 0.12.0

### Patch Changes

- Updated dependencies [a92ea18]
- Updated dependencies [0280a6a]
- Updated dependencies [0c6c186]
- Updated dependencies [86d1482]
- Updated dependencies [af1c007]
- Updated dependencies [12461e1]
- Updated dependencies [4862c8e]
- Updated dependencies [106d38a]
- Updated dependencies [9049c30]
- Updated dependencies [6186edc]
- Updated dependencies [e3ceced]
- Updated dependencies [8363f12]
- Updated dependencies [a7f4329]
- Updated dependencies [155ca6f]
- Updated dependencies [24cbdff]
- Updated dependencies [c50f666]
- Updated dependencies [a7f4329]
- Updated dependencies [9477170]
- Updated dependencies [0524d38]
- Updated dependencies [6a457ac]
- Updated dependencies [e2eecf2]
- Updated dependencies [2800d03]
- Updated dependencies [4ececc6]
- Updated dependencies [96f94c2]
- Updated dependencies [c95def4]
- Updated dependencies [3c7b013]
- Updated dependencies [fd873d2]
- Updated dependencies [b1dc20c]
- Updated dependencies [ac71815]
- Updated dependencies [7c87626]
- Updated dependencies [c020513]
- Updated dependencies [f82c78f]
- Updated dependencies [1a8043c]
- Updated dependencies [6d52561]
- Updated dependencies [520c34f]
- Updated dependencies [28b7621]
- Updated dependencies [9714c75]
- Updated dependencies [63fc847]
- Updated dependencies [4a0b78b]
- Updated dependencies [2d58ea5]
- Updated dependencies [212361b]
- Updated dependencies [6f5c6fc]
- Updated dependencies [34a8433]
- Updated dependencies [bd6ba8e]
- Updated dependencies [0fe00c5]
- Updated dependencies [b8762ef]
- Updated dependencies [f3f55a8]
- Updated dependencies [b2d5bb2]
- Updated dependencies [2d4107f]
- Updated dependencies [75971ad]
- Updated dependencies [3958355]
- Updated dependencies [fd23a8b]
- Updated dependencies [5262408]
- Updated dependencies [d194929]
- Updated dependencies [6ef35a6]
- Updated dependencies [d17d75a]
- Updated dependencies [557e243]
- Updated dependencies [49aee6c]
- Updated dependencies [ea11703]
- Updated dependencies [5305365]
- Updated dependencies [b2caee6]
- Updated dependencies [9baf25f]
- Updated dependencies [9a36b1e]
- Updated dependencies [34f7d92]
- Updated dependencies [a3d45c4]
- Updated dependencies [dcf911b]
- Updated dependencies [b63506b]
- Updated dependencies [b83b831]
- Updated dependencies [dd17e57]
- Updated dependencies [6d28380]
- Updated dependencies [6af89f4]
- Updated dependencies [329faa0]
- Updated dependencies [d770fe7]
- Updated dependencies [88e3ebd]
- Updated dependencies [a7f4329]
- Updated dependencies [da37a13]
- Updated dependencies [0a01ff7]
- Updated dependencies [1c995c4]
- Updated dependencies [6f4a887]
- Updated dependencies [318d610]
- Updated dependencies [ab56cfe]
- Updated dependencies [1aabb03]
- Updated dependencies [119f317]
- Updated dependencies [7ec1738]
- Updated dependencies [df295b2]
- Updated dependencies [d0beedc]
- Updated dependencies [731b264]
- Updated dependencies [a69d861]
- Updated dependencies [ba08e65]
- Updated dependencies [2643a00]
- Updated dependencies [362fd0f]
- Updated dependencies [dbff1e4]
- Updated dependencies [07565c8]
- Updated dependencies [5fcd238]
- Updated dependencies [5e8878c]
- Updated dependencies [6409948]
- Updated dependencies [792c756]
- Updated dependencies [497caab]
- Updated dependencies [35d6e86]
- Updated dependencies [1cf6347]
- Updated dependencies [0cde959]
- Updated dependencies [e094f74]
- Updated dependencies [9ab38fa]
- Updated dependencies [b3673ee]
- Updated dependencies [915db6a]
- Updated dependencies [3e02201]
- Updated dependencies [6c25ed3]
- Updated dependencies [2e4c299]
- Updated dependencies [a3b6ef0]
- Updated dependencies [4c55b5d]
- Updated dependencies [b02fe16]
- Updated dependencies [7b49616]
- Updated dependencies [f0d3620]
- Updated dependencies [472ca95]
- Updated dependencies [548e82c]
- Updated dependencies [252ca39]
- Updated dependencies [8fb29b3]
- Updated dependencies [c439ba0]
- Updated dependencies [6af130f]
- Updated dependencies [2c442f9]
- Updated dependencies [0264069]
- Updated dependencies [2922d36]
- Updated dependencies [d62a947]
- Updated dependencies [872f391]
- Updated dependencies [51820a1]
- Updated dependencies [9ae0e5f]
- Updated dependencies [7d000b9]
- Updated dependencies [66e9264]
- Updated dependencies [cafa240]
- Updated dependencies [813069c]
- Updated dependencies [84362af]
- Updated dependencies [76d6fca]
- Updated dependencies [4c107a2]
- Updated dependencies [26e31c1]
- Updated dependencies [8c20ee2]
- Updated dependencies [b9d72bb]
- Updated dependencies [eeff74c]
- Updated dependencies [251f586]
- Updated dependencies [3c85350]
- Updated dependencies [967b130]
- Updated dependencies [3e9a10f]
- Updated dependencies [8ea2bf9]
- Updated dependencies [8ca2ac7]
- Updated dependencies [2c06e2e]
- Updated dependencies [098a0bb]
- Updated dependencies [72f7584]
- Updated dependencies [e94ed89]
- Updated dependencies [882ac2a]
- Updated dependencies [0132aab]
- Updated dependencies [3ea0b0f]
- Updated dependencies [47c8d7e]
- Updated dependencies [10b1239]
- Updated dependencies [851791f]
- Updated dependencies [4e4c25d]
- Updated dependencies [9c86066]
- Updated dependencies [608a172]
- Updated dependencies [5180720]
- Updated dependencies [b600f72]
- Updated dependencies [3294b3d]
- Updated dependencies [99e323d]
- Updated dependencies [ea11703]
- Updated dependencies [cc45381]
- Updated dependencies [bcfe4c5]
- Updated dependencies [12b6618]
- Updated dependencies [ce194c0]
- Updated dependencies [818a096]
- Updated dependencies [4aa6a33]
- Updated dependencies [9636ce1]
- Updated dependencies [0ac2e5f]
- Updated dependencies [9426389]
- Updated dependencies [2e5e188]
- Updated dependencies [ebb8f4a]
- Updated dependencies [9d2466a]
- Updated dependencies [557e243]
- Updated dependencies [ca34a80]
- Updated dependencies [9f2557b]
- Updated dependencies [29543ca]
- Updated dependencies [e26af7e]
- Updated dependencies [ab79741]
- Updated dependencies [08cddf6]
- Updated dependencies [8efc4f1]
- Updated dependencies [a04ab6e]
- Updated dependencies [a283607]
- Updated dependencies [24fcadc]
- Updated dependencies [b00ee72]
- Updated dependencies [4804da0]
- Updated dependencies [61fe676]
- Updated dependencies [d4b4919]
- Updated dependencies [63e500b]
- Updated dependencies [b72c1a2]
- Updated dependencies [7c426d4]
- Updated dependencies [cd4da46]
- Updated dependencies [b1bb838]
- Updated dependencies [19f19a2]
- Updated dependencies [2a41efd]
- Updated dependencies [d308bf8]
- Updated dependencies [07514c2]
- Updated dependencies [142ba02]
- Updated dependencies [1ab4bb8]
- Updated dependencies [e1ee9dd]
- Updated dependencies [f3c02b3]
- Updated dependencies [32468c3]
- Updated dependencies [0a3e9dd]
- Updated dependencies [e2b04f6]
- Updated dependencies [256f286]
- Updated dependencies [306f50d]
- Updated dependencies [8f372ce]
- Updated dependencies [61becad]
- Updated dependencies [690dcaa]
- Updated dependencies [b7822a7]
- Updated dependencies [c8b65f3]
- Updated dependencies [9feee5e]
- Updated dependencies [f2d8a92]
- Updated dependencies [d005fd9]
- Updated dependencies [0e44f24]
- Updated dependencies [cef0a3b]
- Updated dependencies [bd06669]
- Updated dependencies [5b504b4]
- Updated dependencies [d7b0a3b]
- Updated dependencies [1482a3f]
- Updated dependencies [a574300]
- Updated dependencies [2513a52]
- Updated dependencies [17ed864]
- Updated dependencies [1d6f730]
- Updated dependencies [b125655]
- Updated dependencies [f962a7d]
- Updated dependencies [f4c2702]
- Updated dependencies [dea5df9]
- Updated dependencies [7407d65]
- Updated dependencies [318bbad]
- Updated dependencies [9ffccd5]
- Updated dependencies [fc83abd]
- Updated dependencies [9a3f01e]
- Updated dependencies [178bc6d]
- Updated dependencies [efa7836]
- Updated dependencies [678ba58]
- Updated dependencies [8904184]
- Updated dependencies [e680b16]
- Updated dependencies [a805212]
- Updated dependencies [7263241]
- Updated dependencies [6fed038]
- Updated dependencies [0a27bde]
- Updated dependencies [ea11703]
- Updated dependencies [fa82aef]
- Updated dependencies [178a283]
- Updated dependencies [56276cd]
- Updated dependencies [886453b]
- Updated dependencies [18597fc]
- Updated dependencies [9205bd3]
- Updated dependencies [fce2060]
- Updated dependencies [582fc22]
- Updated dependencies [892b718]
- Updated dependencies [bda45ac]
- Updated dependencies [63629c5]
- Updated dependencies [5885380]
- Updated dependencies [881f900]
- Updated dependencies [6a1ec57]
- Updated dependencies [82a9c4e]
- Updated dependencies [e3d7a8c]
- Updated dependencies [d8e9de1]
- Updated dependencies [72b2984]
- Updated dependencies [5dedae9]
- Updated dependencies [693d1b4]
- Updated dependencies [32584c9]
- Updated dependencies [32353e6]
- Updated dependencies [3ea8217]
- Updated dependencies [559acfa]
- Updated dependencies [1862edc]
- Updated dependencies [8bf4620]
- Updated dependencies [631df48]
- Updated dependencies [97efbaa]
- Updated dependencies [d205e96]
- Updated dependencies [e8088ea]
- Updated dependencies [bb94124]
- Updated dependencies [928e0b2]
- Updated dependencies [1a3de22]
- Updated dependencies [5d816a6]
- Updated dependencies [4c5b2c7]
- Updated dependencies [f9816c0]
- Updated dependencies [578b543]
- Updated dependencies [78523d2]
- Updated dependencies [6fd2a5d]
- Updated dependencies [525aee0]
- Updated dependencies [a20d4d9]
- Updated dependencies [40b50c2]
- Updated dependencies [f112c37]
- Updated dependencies [8048e42]
- Updated dependencies [520c34f]
- Updated dependencies [85bdad2]
- Updated dependencies [e426625]
- Updated dependencies [3d23fd7]
- Updated dependencies [a1d42c4]
- Updated dependencies [4a10672]
- Updated dependencies [ee180f6]
- Updated dependencies [c209b42]
- Updated dependencies [eda8b55]
- Updated dependencies [11de244]
- Updated dependencies [cc11297]
- Updated dependencies [ff37699]
- Updated dependencies [6dadb41]
  - @dxos/echo@0.12.0
  - @dxos/app-framework@0.12.0
  - @dxos/app-toolkit@0.12.0
  - @dxos/ai@0.12.0
  - @dxos/ui-theme@0.12.0
  - @dxos/compute@0.12.0
  - @dxos/react-ui@0.12.0
  - @dxos/effect@0.12.0
  - @dxos/graph@0.12.0
  - @dxos/react-ui-canvas@0.12.0
  - @dxos/types@0.12.0
  - @dxos/react-ui-syntax-highlighter@0.12.0
  - @dxos/util@0.12.0
  - @dxos/async@0.12.0
  - @dxos/log@0.12.0
  - @dxos/debug@0.12.0
  - @dxos/context@0.12.0
  - @dxos/conductor@0.12.0
  - @dxos/echo-react@0.12.0
  - @dxos/react-client@0.12.0
  - @dxos/react-ui-canvas-editor@0.12.0
  - @dxos/react-ui-audio@0.12.0
  - @dxos/react-ui-experimental@0.12.0
  - @dxos/keys@0.12.0
  - @dxos/invariant@0.12.0

## 0.11.1

### Patch Changes

- @dxos/ai@0.11.1
- @dxos/app-framework@0.11.1
- @dxos/app-toolkit@0.11.1
- @dxos/assistant@0.11.1
- @dxos/async@0.11.1
- @dxos/compute@0.11.1
- @dxos/compute-runtime@0.11.1
- @dxos/conductor@0.11.1
- @dxos/context@0.11.1
- @dxos/debug@0.11.1
- @dxos/echo@0.11.1
- @dxos/edge-client@0.11.1
- @dxos/effect@0.11.1
- @dxos/graph@0.11.1
- @dxos/invariant@0.11.1
- @dxos/keys@0.11.1
- @dxos/log@0.11.1
- @dxos/react-client@0.11.1
- @dxos/react-edge-client@0.11.1
- @dxos/react-ui-attention@0.11.1
- @dxos/react-ui-audio@0.11.1
- @dxos/react-ui-canvas@0.11.1
- @dxos/react-ui-canvas-editor@0.11.1
- @dxos/react-ui-editor@0.11.1
- @dxos/react-ui-experimental@0.11.1
- @dxos/react-ui-form@0.11.1
- @dxos/react-ui-mosaic@0.11.1
- @dxos/react-ui-syntax-highlighter@0.11.1
- @dxos/schema@0.11.1
- @dxos/types@0.11.1
- @dxos/util@0.11.1

## 0.11.0

### Patch Changes

- Updated dependencies [f9ba47a]
- Updated dependencies [4e64123]
- Updated dependencies [c035062]
- Updated dependencies [aea1e6e]
- Updated dependencies [9da013f]
- Updated dependencies [e0e1a9f]
- Updated dependencies [46ec569]
- Updated dependencies [53fde97]
- Updated dependencies [5b05d75]
- Updated dependencies [b5ecf54]
- Updated dependencies [3f6ac61]
- Updated dependencies [091ebe4]
- Updated dependencies [ed992c2]
- Updated dependencies [1a9bca1]
- Updated dependencies [ed992c2]
- Updated dependencies [bf013a1]
- Updated dependencies [a19443b]
- Updated dependencies [3f1fc67]
- Updated dependencies [2048cb3]
- Updated dependencies [46ec569]
- Updated dependencies [f8637f1]
- Updated dependencies [b8c0825]
- Updated dependencies [4e64123]
- Updated dependencies [2e10525]
- Updated dependencies [6a03a30]
- Updated dependencies [2fe5a7a]
- Updated dependencies [7b270f2]
- Updated dependencies [7b270f2]
- Updated dependencies [af5fbf4]
- Updated dependencies [717edc0]
- Updated dependencies [d547045]
- Updated dependencies [d958118]
- Updated dependencies [30ae5eb]
- Updated dependencies [6d2afe0]
- Updated dependencies [e65432c]
- Updated dependencies [f6a01e3]
- Updated dependencies [c9651f1]
- Updated dependencies [5e7839e]
- Updated dependencies [923d5be]
- Updated dependencies [85893fe]
- Updated dependencies [9f7d5ad]
- Updated dependencies [6067460]
- Updated dependencies [717edc0]
- Updated dependencies [12fd785]
- Updated dependencies [51aaffe]
- Updated dependencies [f10b1ce]
- Updated dependencies [f7d7735]
- Updated dependencies [717edc0]
- Updated dependencies [5f08a6a]
- Updated dependencies [37874ce]
- Updated dependencies [848ba1b]
- Updated dependencies [3761762]
- Updated dependencies [c9da903]
- Updated dependencies [bf055c8]
- Updated dependencies [55bb048]
- Updated dependencies [bdf9f68]
- Updated dependencies [4bb7e3b]
- Updated dependencies [4df6cf3]
- Updated dependencies [7b270f2]
- Updated dependencies [686fac1]
- Updated dependencies [ed992c2]
- Updated dependencies [96109be]
- Updated dependencies [37c17cc]
- Updated dependencies [f0ec728]
- Updated dependencies [08a3eea]
- Updated dependencies [ed992c2]
- Updated dependencies [ed992c2]
- Updated dependencies [c58ebb7]
- Updated dependencies [a49131a]
- Updated dependencies [5585ec8]
- Updated dependencies [ac51564]
- Updated dependencies [499dde4]
  - @dxos/echo@0.11.0
  - @dxos/async@0.11.0
  - @dxos/schema@0.11.0
  - @dxos/react-ui@0.11.0
  - @dxos/react-ui-editor@0.11.0
  - @dxos/app-toolkit@0.11.0
  - @dxos/compute-runtime@0.11.0
  - @dxos/compute@0.11.0
  - @dxos/util@0.11.0
  - @dxos/app-framework@0.11.0
  - @dxos/keys@0.11.0
  - @dxos/react-ui-form@0.11.0
  - @dxos/react-ui-attention@0.11.0
  - @dxos/types@0.11.0
  - @dxos/ui-theme@0.11.0
  - @dxos/log@0.11.0
  - @dxos/react-ui-mosaic@0.11.0
  - @dxos/react-client@0.11.0
  - @dxos/ai@0.11.0
  - @dxos/edge-client@0.11.0
  - @dxos/graph@0.11.0
  - @dxos/assistant@0.11.0
  - @dxos/conductor@0.11.0
  - @dxos/react-ui-canvas-editor@0.11.0
  - @dxos/react-ui-audio@0.11.0
  - @dxos/react-ui-canvas@0.11.0
  - @dxos/react-ui-experimental@0.11.0
  - @dxos/react-ui-syntax-highlighter@0.11.0
  - @dxos/react-edge-client@0.11.0
  - @dxos/context@0.11.0
  - @dxos/effect@0.11.0
  - @dxos/debug@0.11.0
  - @dxos/invariant@0.11.0
