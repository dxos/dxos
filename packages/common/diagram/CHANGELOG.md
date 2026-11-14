# @dxos/diagram

## 0.17.0

### Minor Changes

- 82f2242: A laid-out diagram opened in the Canvas editor ("Edit in Canvas") now draws with the same renderer as its SVG file: `SvgFile` builds a `Markup` tree (`sceneTree`, `elementMarkup`, `markerDefs`, `connectorElements`) that `@dxos/react-ui-canvas`'s new `diagram` node type and diagram connectors render, keeping the layout's bends, group tints, colors, fonts and markers; a connector whose box moves re-routes with the layout's own router (`UmlGrid.rerouteConnector`).
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

- 1302e04: `@dxos/diagram` adds `diagramPreview()`, a CodeMirror extension that renders every ` ```diagram ` fence in a markdown document as its laid-out diagram, showing the source again while the selection is inside the fence; `renderDiagram(source)` returns the standalone SVG and its size.
- 7067fec: Edges that leave one node with the same label now share one port and one trunk, labelled once, as `edge A -> B, C bus` draws without writing `bus`. Every trunk is laid out with its source upstream and its targets side by side.
- bc50a90: The `.dx` diagram DSL draws sequence diagrams (`diagram kind=sequence`: participants, `calls`/`sends`/`returns` messages with activations, notes and `alt`/`opt`/`loop`/`par`/`break`/`critical` fragments) and data-flow diagrams (`diagram kind=dataflow`: process, store and external roles, with warnings for flows that break the data-flow rules). Mermaid input is deprecated: the `generate` operation and `Mermaid.compile`, `Uml.compile` and `MermaidEngine.compile` still work but are marked deprecated in favour of `draw` and `Dsl.compile`.

### Patch Changes

- 39eb10b: Exported diagram SVGs now render correctly outside browsers: tinted group frames and hollow markers carry plain-color fallbacks, so librsvg, sharp and ImageMagick no longer paint them solid black or see-through.
- Updated dependencies [a349ae0]
- Updated dependencies [10a11da]
- Updated dependencies [b0113a1]
- Updated dependencies [c9c3867]
  - @dxos/scene@0.17.0
  - @dxos/util@0.17.0
  - @dxos/effect@0.17.0
  - @dxos/invariant@0.17.0

## 0.16.0

### Patch Changes

- @dxos/effect@0.16.0
  - @dxos/invariant@0.16.0
  - @dxos/util@0.16.0

## 0.15.0

### Minor Changes

- 647b4bd: `@dxos/diagram` renders a scene to SVG text without React (`SvgFile.toSvgFile`, `SvgFile.sceneMarkup`), so CLIs and
  workers can write diagrams to files; plugin-illustrator's `SceneSvgFile` component is removed in its favor.

  The DXOS CLI gains `dx drawing render | import | list | export`, which lay out a `.dx` file, import a `.dx.svg` (including
  one that carries only its DSL source) into a space, and export it back out. A laid-out drawing can be converted to an
  editable Canvas, tldraw or Excalidraw drawing with the new `Convert` operation and its plank actions. `dx space share`
  and other space commands fall back to the first visible space when no default is set, and sharing waits for the space to
  be ready.

### Patch Changes

- @dxos/effect@0.15.0
  - @dxos/util@0.15.0
  - @dxos/invariant@0.15.0

## 0.14.0

### Patch Changes

- b0e4b60: In `@dxos/react-ui-canvas`, a link may carry `text`, drawn at the middle of its route on an opaque rounded backdrop. Guides and borderless shapes are off the lattice: they occupy no cells, move and resize freely, and do not block gutter routes. A nested scene routes on its parent's lattice, so its links no longer jump when it settles. On a lattice a smart link takes the side-centre ports whose gutter route bends least (a pinned port stays pinned), and the gutter search runs on a binary heap. A label's or note's lines are a whole number of minor grid units tall, padded a grid unit either side, and a guide's text takes the default colour. `SceneView.Root`'s `readonly` now also prevents selection and hides the selection frame, ports, the actions bar, the Properties and Layers panels, the grid and the lattice guides.

  In `@dxos/plugin-canvas`, a laid-out illustrator diagram draws on the canvas lattice as it renders: each connector binds to its boxes as a `smart` link carrying its caption as `text`, and a group is a guide titled at its top-left corner on a `Backdrop` layer below the shapes. A linked drawing's own frames open the drawings they show, so drawings nest to any depth. A frame's object resolves through the canvas's database, and its role field appears as soon as an object is picked. Read-only is the viewer's own, kept in the canvas's view state and toggled from the drawing's menu (Read only / Edit drawing). The plugin offers a "DXOS Architecture" space template: multi-level Composer and EDGE architecture diagrams (from `docs/diagrams/*.dx`) seeded as nested canvas drawings, which the `Architecture` stories also load, read-only by default. Composer enables the plugin by default.

  In `@dxos/diagram`, a group frame's margin is the same on every side, with its title inside the top margin, and a diagram with an explicit `grid` keeps every box on it: extra space between groups is whole cells.

  In `@dxos/react-ui-form`, picking a reference in `RefField` commits it, so an auto-saving form saves the pick at once rather than on the next field's edit.

- Updated dependencies [1819960]
  - @dxos/effect@0.14.0
  - @dxos/invariant@0.14.0
  - @dxos/util@0.14.0

## 0.13.0

### Minor Changes

- 5a27d5c: Decisions can carry images for models that read them. `DecisionModel.decide(definition, { input, images })` reaches Clef and Clef Flash as embedded data URLs on the System One `images` extension; jev, which reads no images, fails such a call with `InvalidUserInputError` rather than answer blind. `TypeSafeResolver.makeDecisionModel` takes `images: true` to opt a back-end in, and the resolver sets it from a model's `image` characteristic. Effect's `DecisionModel` gains `images` through a local patch until the upstream change lands.

  `@dxos/diagram` gains a rule library of what makes a diagram read well (`rules/DIAGRAM.mdl`, parsed by `Rules`), scored by `Appeal`: rules measurable from geometry are scored in code, and the rest are asked of a judge shown the rendered page (`Architecture.judge` and `Aesthetics.judge` accept a subject with `images`). `Appeal.objective()` lets the layout engine choose by appeal. `DxSvg` embeds a JSON payload in an SVG's `<metadata>`, so a drawing exported as `.dx.svg` opens as an image anywhere and imports back as editable objects.

  The mermaid layout engine draws tidier diagrams: ports along each box side follow the order their connectors turn away (`Ports`), parallel runs that share a line are nudged apart (`Nudge`), and placements are compacted toward the boxes they connect. On the illustrator's corpus, crossings fall from 56 to 23 and no connectors overlap; compiling takes longer because each candidate is re-routed.

- 234ef9c: `MermaidEngine` lays out diagrams several times faster: the edge router's search uses typed arrays and an arrival-aware turn estimate, and candidates whose inheritance bus would draw nothing are no longer routed twice. Routes keep their optimal cost, though ties between equal-cost routes can now resolve differently. A new `emitCandidate` option, with `emitJob`, lets a caller route candidates on worker threads.
- 014996b: Edge labels sit beside their own route and off group frame borders. The semantic DSL gains soft sides (`A:~left`), group shape (`compact`, `max-width=N`, `diagram aspect=W:H`) and fan-in buses (`edge A, B -> C bus`), and warns about a bus it cannot honour or a group frame an outside relation stretches. Diagnostics measure bound arrows as drawn, count a bus as one connector, and no longer count T-junctions or self-loops as crossings. Node labels wrap, shrink or ellipsize to stay inside their box, and re-rendering a source gives a byte-identical `.dx.svg`.
- 22adb53: When several connectors share one side of a box, the most significant relationship takes the centre of that side: inheritance and implementation first, then composition, then aggregation and the one-to-many and many-to-many relations, then plain associations, then dependencies. `Semantic.significance` exposes the ranking.
- 2550779: The diagram DSL gains a semantic layer: `diagram`, `group`, `node` and `edge` statements describe what is related and roughly where, and `Dsl.compile` places and routes the rest. Constraints range from loose to exact — `right-of`, `above`, `same-row` (soft with `~`), grid cells, absolute positions, port sides, `via` waypoints and shared `bus` channels — so a model can write a good-looking diagram directly, without a helper script.

  Edges name UML and ER relationships — `extends`, `implements`, `composes`, `owns`, `depends-on`, `one-to-many`, `many-to-many` — and the renderer draws their line endings (hollow triangle, filled and hollow diamond, crow's foot, dashed lines). Children that extend or implement the same parent sit on one row and meet it through a single trunk and triangle. Mermaid class and ER diagrams carry the same relations through. The illustrator's Constraints story shows each diagram beside its DSL and scores.

  The illustrator's `render-diagrams` task renders `.dx` sources as well as mermaid, writes a PNG beside each file it is given, and runs from source again.

### Patch Changes

- Updated dependencies [cb1e218]
- Updated dependencies [e99ee70]
- Updated dependencies [1894fc1]
  - @dxos/util@0.13.0
  - @dxos/effect@0.13.0
  - @dxos/invariant@0.13.0

## 0.12.0

### Minor Changes

- 119f317: Extract the renderer-neutral scene DSL, dialects, layout engines, diagnostics and SVG content handler from `@dxos/plugin-illustrator/model` into the new `@dxos/diagram` package; the plugin's `model` entry now exports only the ECHO-bound builders (`makeBuilder`, `SvgBuilder`). The DSL gains arrow endpoint ports (`from`/`to` accept `object/element#port`, with `Scene.parseRef` / `Scene.resolveRef`), a `portal` element referencing a nested drawing, and an optional fractional `index` on world objects for z-order.

  Add the scene engine (`@dxos/react-ui-canvas/scene`): an infinite, zoomable canvas of typed nodes (rectangle, ellipse, UML class, text, portal) and links (line, curve, spline) at multiple depths, with drill-in through portals, a projection seam for freehand, constrained and graph-driven layouts, in-place text editing, node styles, undo/redo, cut/copy/paste and a schema-driven properties panel. The private `@dxos/plugin-canvas` contributes it to the illustrator as the `dxos.org/scene/1` drawing variant.

- 18758f9: A text DSL for the scene language, so a diagram can be reviewed, hand-edited and blamed like code rather than exchanged only as JSON.

  `Dsl.parse` reads a document into `Scene.Command[]` — reporting located problems instead of throwing, so an editor keeps rendering the last good shapes while a line is half-typed — and `Dsl.print` writes a scene back in a canonical form that round-trips. The grammar is Lezer (`src/dsl/diagram.grammar`, generated by a `prebuild-lezer` task) and covers everything `scene.ts` can express, including the two a line-based syntax usually loses: arrow ends bound to an element (`A/box#left -> B/box`, which track their target when it moves) and `portal` windows onto another drawing. `Scene.BoxKind` and `Scene.Corners` are now named literals so the DSL reads its vocabulary off the schema.

  `Dsl.convert` turns a mermaid flowchart or classDiagram into DSL text by running the existing dialect and printing its commands, so every source language the registry gains converts for free; `moon run diagram:convert -- <file>` exposes it. The output is the post-layout form — the DSL has no unpositioned node — which is the point: generate a layout once, then keep it as something you can tune and check in.

  `@dxos/diagram/extension` adds the CodeMirror mode: highlighting off the parse tree, completion over the schema's own attribute tables, and a linter reporting both parse problems and the `Diagnostics` layout report against the statement that caused it. A ```diagram fenced block is a sibling of MDL's grammar dispatched by the fence, not a nesting inside it; `docs/DSL.md` has the reasoning.

  `plugin-illustrator` gains a `Draw` operation taking DSL source, beside `Generate` which keeps owning layout. It returns parse `problems` with line and column alongside the layout `diagnostics`, so an agent can fix its own syntax and its own overlaps. The UML skill documents the syntax and when to prefer it over generation.

- ca04eca: Diagrams can now be graded on one 0–1 scale: `Score` turns layout constraints and costs (including new overlapping-text and overlapping-arrow diagnostics) into scores, `Architecture` and `Aesthetics` judge content and drawn layout against written rules in one `DecisionModel` call, and `View` renders a layout as text for judges that cannot read images. Flowcharts gain UML relation kinds drawn with the existing markers and a translucent `tint` fill for group frames, and the illustrator adds a Score operation and a live Scores companion so an assistant can score and redraw a drawing.

### Patch Changes

- Updated dependencies [3c7b013]
- Updated dependencies [fd873d2]
- Updated dependencies [fd23a8b]
- Updated dependencies [472ca95]
- Updated dependencies [967b130]
- Updated dependencies [882ac2a]
- Updated dependencies [9d2466a]
- Updated dependencies [b1bb838]
- Updated dependencies [e8088ea]
- Updated dependencies [1a3de22]
- Updated dependencies [6dadb41]
  - @dxos/effect@0.12.0
  - @dxos/util@0.12.0
  - @dxos/invariant@0.12.0
