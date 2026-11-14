# @dxos/plugin-canvas

## 0.17.0

### Minor Changes

- 5ee83e7: `Canvas.About` and `AboutInspector` are removed; the Views panel's rows carry the counts. Deleting an Object with its instances (`removeComposite`) also deletes, in the same undo step, the records only those instances pointed at, and Ungroup brings an Object's animation tracks back out onto the new nodes, placed and sized as the Instance drew them. The floating inspector panel is one scrolling list again; only the docked panel splits Properties from the other sections. In plugin-canvas, `CanvasOperation.ImportTldraw` takes `snap` (true by default), aligning the imported shapes' positions and sizes to the canvas grid. A tldraw frame now becomes a labelled outline rectangle on a frames layer under its shapes, which stay in the same View (tldraw has no nested scenes), so arrows into the frame stay bound. A plain (non-smart) line bound to a node without a port now points at the node's centre and stops at its outline; smart lines still attach at ports.
- c1c6cf4: Breaking: the scene container is renamed View across the API — `SceneId` → `ViewId`, `SceneStore` → `ViewStore`, `SceneKind` → `ViewKind`, `Scene` → `View`, `SceneBuilder` → `ViewBuilder`, `useSceneProjection` → `useViewProjection`, the store's `scenes`/`scene(id)` → `views`/`view(id)` — and the `frame` node type is now `view` (`FrameNode` → `ViewNode`, `isFrameNode` → `isViewNode`); stored `frame` nodes load as `view`. react-ui-canvas-compute and plugin-canvas follow (`boardSceneId` → `boardViewId`, `readScenes`/`writeScenes` → `readViews`/`writeViews`, `ROOT_SCENE_ID` → `ROOT_VIEW_ID`, `DYNAMIC_SCENE_ID` → `DYNAMIC_VIEW_ID`).

  The canvas's commands live in a React-free `CanvasController` (`createCanvasController`), organised by aspect (selection, editing, tools, time, navigation, look), and its parts read their own state, so panning or a selection change no longer re-renders panels that do not show it. A read-only canvas pastes, cuts and deletes nothing.

  The new `Canvas.Views` panel shows the drawing's Views, nodes, links and placed Objects as a tree: a row selects on the canvas (opening an Object in isolation for its contents), the root row selects everything, a double-click opens a View, a drag restacks siblings, and a filter narrows the rows. Group (⌘G) makes an anonymous Object and one Instance in place of the selection, which joins the Objects library once named or placed again; Ungroup (⇧⌘G) puts it back. `groupIntoView` and the Compose button are removed, and deleting the last node that opens a View or an anonymous Object deletes that record, as stores do on load (`createMemoryStore`'s `root` option, plugin-canvas on bind).

  The inspector panel shows the same sections docked or floating, Properties above a draggable seam and the rest below (`InspectorSectionDef.pane`; `InspectorSectionDef.show` and `InspectorPanel.Root`'s `selected` are removed); selection actions sit in its toolbar (`InspectorPanel.Root` `actions`). New shapes: `cloud` (key C, with a bump count) and a regular `polygon` (key N, with a side count), drawn through `NodeDef.silhouette`; every node takes a `rotation` in 15° steps. The timeline's key actions move into one menu, and the scene-tree fixtures move from `builder/testing` to `testing`.

- cab57d0: Breaking: the scene UI is now `@dxos/react-ui-canvas` (the 2D and 3D surface, with `/3d`, `/io` and `/headless` entries) and the new `@dxos/react-ui-canvas-editor` (`SceneEditor`: one editor for both dimensions, with its tool rail, actions bar, display panel, inspectors and Timeline); `@dxos/react-ui-scene` and `@dxos/plugin-spacetime` are removed, and `@dxos/scene`, `@dxos/animation`, `@dxos/react-ui-animation` and `@dxos/plugin-animator` are now public. `@dxos/plugin-canvas` moves legacy scene drawings onto `Canvas` objects when a space loads and draws them in both dimensions: a 3D canvas places primitives and meshes, joins, subtracts and extrudes solids, imports OBJ and GLB and exports STL, and its rail's Library tool inserts the bundled race car, fire engine and taxi (plugins add more through `CanvasCapabilities.LibraryItem`); a Neu shape with no hue draws as Neutral, and a canvas embedded in markdown takes a 16:9 height and opens fitted.

  An object opened outside any collection (`…/db/<type>+<id>`) resolves again, as the app graph no longer wraps a type node's schema in an action forwarder, and an object in a nested collection is addressed as `object/<id>`.

  `Surface.useContributions(role)` subscribes a component to a role's contributed surfaces, so a check made with `Surface.useIsAvailable` is repeated once a module loaded on demand contributes; a markdown embed uses it, and no longer stays blank when its preview's surface module loads after the embed first renders.

- e82b80a: ECHO adds content migrations for formats stored inside an object field: `Annotation.ContentVersionAnnotation` marks the field holding the version, `Migration.defineContent` declares one step, `db.runMigrations` applies each object's chain once, writing only the records that change, and `Migration.upgradeContent` applies it in memory. The canvas is the first user: every stored drawing moves from `dxos.org/scene/1` to `dxos.org/scene/2` on first start (a frame's `role` moving into its `link`), so a client on an earlier release cannot open a migrated drawing until it updates, and from this release a drawing saved by a newer Canvas plugin opens read-only. The canvas also gains a polyline shape and tool (Y) and a per-type edit mode entered by double-click (a label, or a polyline's draggable vertices), and Rounded and line style now draw the same on every shape.

  Breaking: `CanvasAtoms.editing` is an `Editing` union replacing `EditingPart`; the lattice snap toggle (`CanvasAtoms.lattice`, `toggleLattice`, Shift+G) is removed, since a lattice scene always snaps to its cells and shows no grid; and drawing variants match a canvas by format rather than by exact version string.

- 10a11da: A canvas selection can be restacked — `Bring to front` / `Send to back` in the right-click menu and on ⌘] / ⌘[ — and a layer now paints its nodes and links in one order by `z`, so a shape drawn over a link covers it and a link drawn over a shape crosses it, matching what the Views list shows and what a click selects. The selection is no longer raised above its neighbours.

  A 2D layout carries a `grid` pitch, which the new `Drawing` inspector section edits along with the lattice, and `DEFAULT_GRID` is 12 (major cell 48). Every default and fixture geometry that was written in 64px cells — shape sizes, layout pitches, the compute shapes and circuits, the `.dx` exemplars — is now expressed in major cells, so it holds whatever the drawing's grid is. ⌘' toggles the background grid, and shape text is 20px.

- e8029c3: Canvas undo and redo patch the store instead of restoring snapshots. Every edit is a commit of a `CanvasHistory` that records the store's heads before and after and the paths it wrote; undo writes a path back only while nobody has changed it since, and returns the view to the View path and selection the edit was made in. `Canvas.Root` takes `history` (from `useCanvasHistory`, or a `CreateHistory`); without one the canvas keeps a local history, so ⌘Z, ⇧⌘Z and the toolbar work standalone. Breaking: `Projection.snapshot`/`restore`, `withUndo`, `recordViews`, `recordStoreStep` and `CanvasAtoms.undo` are removed; a projection with a model of its own exposes it as `model` (a `VersionedSource`) and may implement `restored()`, and `useViewProjection` now takes `history`. `ViewStore.versions`, `VersionedSource`, `recordChanges` and `patchSource` are exported from `headless`.

  In plugin-canvas, a canvas in Composer records its edits on the app's `HistoryTracker` as `CanvasOperation.Patch`, scoped to the canvas, and agents can edit a canvas with `CanvasOperation.Apply` (intents); both are undoable, and `Apply` refuses a malformed intent (`isIntent`, exported from `headless`) or a canvas with no version history before it writes. The ECHO-backed store reads its past through Automerge heads. In app-framework, `UndoMapping` gains `merge` (fold merged invocations into one forward and re-derive the inverse) and `toast` (false records an entry without the deck's undo toast).

  Drawing conversion copies by default: `DrawingOperation.Convert` writes a new drawing beside the source (`replace: true` converts in place, as drawing.sh does) and names it in its output, and Composer's menu offers "Copy as …" for each variant, opening the copy. A plugin can register an `IllustratorCapabilities.Converter` for a pair of variants, which `Convert` uses over the generic scene replay (`IllustratorModel.convertByScene`). plugin-canvas registers one for tldraw to canvas that converts a DSL-managed drawing generically and maps a hand-drawn one shape by shape; breaking: `CanvasOperation.ImportTldraw` and its "Copy as canvas" action are removed in its favour.

  The canvas's Snap and Lattice toggles move to the bottom-right bar beside the grid and guides, and the centre action bar hides on a canvas too narrow for it. A link's `style.fontSize` sets its caption's size (unset is `LINK_FONT_SIZE`, 14), and a caption on a straight sloped line is shortened only when it does not fit the line's run. A rounded regular polygon rounds its corners by the look's rounded radius; a `NodeDef.silhouette` is given that radius in px. A polygon's `params.fit` sets how it sits in its frame: `frame` (the default) fills the frame, `circle` puts its vertices on the circle that fits it; `polygonPath` takes an options bag. The bottom-right bar ends with the theme picker. A form field override can control a nested group's `open` state (`onOpenChange`); the canvas properties panel takes `groups`, and plugin-canvas keeps which groups are open in its view state. Breaking: `ThemePanel` is renamed `DisplayPanel`. Breaking: a polygon's `sides` and `fit` and a cloud's `bumps` move into the node's `params` (`PolygonParams`, `CloudParams`), shown as the type's own group in the properties panel; stored drawings read in the new shape through `withLegacyParams`.

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

- 6030742: A tldraw drawing can be copied as a canvas: `CanvasOperation.ImportTldraw` maps its shapes to nodes, its arrows to links (bound ends stay attached to their nodes), and its frames to View nodes over Views of their own and its groups to anonymous Objects, then files the new drawing beside the original and opens it. The action ("Copy as canvas") appears on every tldraw drawing; plugin-tldraw takes no dependency on plugin-canvas. Rotation carries over; tldraw's clouds and regular polygons map to the canvas's own, and the shapes it has no match for become rectangles. `@dxos/react-ui-canvas/headless` now exports `composeSelection` and the other pure grouping helpers, so a host can group nodes without loading React.
- c9c3867: Add `ExportOperation.Print` and `ExportOperation.Save` with a per-type `AppCapabilities.Exporter` capability. Objects whose type contributes an exporter get "Print…" and "Save as file…" on their article menu. Markdown saves `.md`, sheets save `.csv`, tables save `.dx.json`, and 2D canvas drawings save `.svg`. Print opens the browser print dialog, which can save a PDF. `@dxos/util` gains `printHtml`, `htmlTable` and `escapeHtml`.

### Patch Changes

- a349ae0: A drawing's `grid` pitch must be at least one: snapping divides by it, so a layout patch storing zero or a
  negative pitch would have put every drop and nudge at `NaN`. A restack also keeps an element whose id is
  `__proto__`, which an object literal would have dropped from the edit.
- 0590c11: New Demo space template: sixteen chess games at every stage, a world map of every Cloudflare data centre with a globe tour from Los Angeles to Sydney, a voxel creeper, a voxel town, and a spacetime scene of three race cars and a fire truck. `@dxos/plugin-spacetime` is now public, with a `SpacetimePresets` entry that builds a preset model (fire truck, race car, taxi) as a stored mesh. A game now has an optional `description`, which chess keeps set to the current FEN so tables and cards show each position; chess cards draw their board full width again, and the move list drops its focus ring. A map's `coordinates` are its globe tour route; the globe gets a light street-map palette, small dark-blue markers, a red tour route and a margin at rest, and flat-map pins shrink to 60%. The DXOS Architecture template's metrics sheet gains a pie of the busiest plugins' PR share. Refs to the same object from different clients in one page no longer share a cached atom, so each client resolves a ref through its own database (previously every client's editor bound to whichever client loaded the object first). Replicated comments now show up on every peer: the editor retries an anchor whose cursor cites edits not yet received, and comment sync re-reads anchors when a thread arrives after its anchor. Many clients editing one document replicate much faster: sync no longer rebuilds Automerge changes on every message to check a peer's initial heads (patched `@automerge/automerge-repo`), and a query from objects to typed relations on them (`select(...).targetOf(Type)`, as comment threads use) re-runs only when those objects, relations of that type, or the relations' endpoints change, rather than on every write in the space. A masonry grid now has the same gap on all four sides: inside a padded `Masonry.Content` it adds the gap above and below as well as at the sides, and a non-scrolling grid (`scroll={false}`) adds none, leaving the perimeter to its host. Padding of `p-3` is now the equivalent `p-trim-md` token. A toolbar now insets both ends by the same gap, whether the edge item is a labelled control or an icon-only button, plugin-theme registers the menu translations so the overflow button reads "More", and a project's pipeline toggle reads "Hide pipeline" while the chart is shown.
- Updated dependencies [fc5e071]
- Updated dependencies [c9a38c1]
- Updated dependencies [b6d1c9c]
- Updated dependencies [90a7f6e]
- Updated dependencies [c1f845f]
- Updated dependencies [9cb96c7]
- Updated dependencies [caa28b3]
- Updated dependencies [812ae94]
- Updated dependencies [cb058b9]
- Updated dependencies [710da43]
- Updated dependencies [5ee83e7]
- Updated dependencies [a761a74]
- Updated dependencies [c1c6cf4]
- Updated dependencies [82f2242]
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
- Updated dependencies [b97d8ea]
- Updated dependencies [b0113a1]
- Updated dependencies [e343467]
- Updated dependencies [9a3313a]
- Updated dependencies [034e231]
- Updated dependencies [0590c11]
- Updated dependencies [9fe0e5c]
- Updated dependencies [1302e04]
- Updated dependencies [7067fec]
- Updated dependencies [bc50a90]
- Updated dependencies [08f8784]
- Updated dependencies [d45bf58]
- Updated dependencies [98db701]
- Updated dependencies [6eb949e]
- Updated dependencies [39eb10b]
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
- Updated dependencies [d95ffc3]
- Updated dependencies [78e96da]
- Updated dependencies [f37ae92]
- Updated dependencies [416201f]
- Updated dependencies [3aef671]
- Updated dependencies [df1380a]
- Updated dependencies [13bc40d]
- Updated dependencies [a1c19cc]
- Updated dependencies [59b9d5a]
- Updated dependencies [7751052]
- Updated dependencies [545ee73]
- Updated dependencies [2bba392]
- Updated dependencies [38ebf5e]
- Updated dependencies [9d66bcd]
- Updated dependencies [592fdad]
- Updated dependencies [49df146]
- Updated dependencies [a18cb35]
- Updated dependencies [6030742]
- Updated dependencies [074e3e6]
- Updated dependencies [05e0b67]
- Updated dependencies [17a9e75]
- Updated dependencies [b46d89b]
- Updated dependencies [853663c]
- Updated dependencies [1f73ed2]
- Updated dependencies [691fe84]
- Updated dependencies [a843e27]
- Updated dependencies [3f5e201]
- Updated dependencies [27b3290]
- Updated dependencies [45e1c93]
- Updated dependencies [03ee407]
- Updated dependencies [6fd1079]
- Updated dependencies [af8ed26]
- Updated dependencies [2d585c2]
- Updated dependencies [0166448]
- Updated dependencies [99708bd]
- Updated dependencies [0ebb028]
- Updated dependencies [392bed0]
- Updated dependencies [34643a3]
- Updated dependencies [38b815b]
- Updated dependencies [f86f10e]
- Updated dependencies [c9c3867]
- Updated dependencies [80818bc]
- Updated dependencies [aedf119]
- Updated dependencies [8554a26]
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
- Updated dependencies [ccb00a4]
- Updated dependencies [02254b0]
- Updated dependencies [296c44c]
- Updated dependencies [bf1dc0c]
- Updated dependencies [7e07e49]
- Updated dependencies [b159f41]
- Updated dependencies [3b37cd1]
- Updated dependencies [8a66e4e]
- Updated dependencies [8e2f718]
- Updated dependencies [d00cc85]
- Updated dependencies [0a14251]
- Updated dependencies [768db81]
- Updated dependencies [841c4f7]
- Updated dependencies [10b3963]
- Updated dependencies [e1d537b]
- Updated dependencies [1a0fff1]
- Updated dependencies [901c1e4]
- Updated dependencies [c1c6cf4]
- Updated dependencies [6f27147]
- Updated dependencies [e67aa80]
- Updated dependencies [df65316]
  - @dxos/plugin-illustrator@0.17.0
  - @dxos/types@0.17.0
  - @dxos/plugin-markdown@0.17.0
  - @dxos/app-toolkit@0.17.0
  - @dxos/echo@0.17.0
  - @dxos/app-graph@0.17.0
  - @dxos/react-ui-attention@0.17.0
  - @dxos/react-ui@0.17.0
  - @dxos/compute@0.17.0
  - @dxos/app-framework@0.17.0
  - @dxos/react-ui-canvas@0.17.0
  - @dxos/diagram@0.17.0
  - @dxos/scene@0.17.0
  - @dxos/plugin-presenter@0.17.0
  - @dxos/react-ui-canvas-editor@0.17.0
  - @dxos/react-ui-form@0.17.0
  - @dxos/keys@0.17.0
  - @dxos/plugin-sheet@0.17.0
  - @dxos/react-ui-list@0.17.0
  - @dxos/util@0.17.0
  - @dxos/plugin-animator@0.17.0
  - @dxos/plugin-attention@0.17.0
  - @dxos/animation@0.17.0
  - @dxos/echo-react@0.17.0
  - @dxos/react-client@0.17.0
  - @dxos/ui-theme@0.17.0
  - @dxos/effect@0.17.0
  - @dxos/log@0.17.0
  - @dxos/invariant@0.17.0

## 0.16.0

### Minor Changes

- 4be32be: `SceneView` is renamed `Canvas` (`SceneView.Canvas` is now `Canvas.Viewport`), and its inspectors sit in one `InspectorPanel` that docks beside the canvas or floats over it, with each inspector framed by an `InspectorSection`. Background dots now hold their size while the view moves, a trackpad swipe pans in both directions, each drawn frame opens onto a scene of its own, and drilling into an empty or nested frame zooms and returns level by level. A number field with a fractional step rounds to that step, and opacity is bounded to 0–1.

### Patch Changes

- Updated dependencies [4be32be]
- Updated dependencies [67f3f9f]
- Updated dependencies [dc7785a]
- Updated dependencies [2f76f26]
  - @dxos/react-ui-canvas@0.16.0
  - @dxos/react-ui@0.16.0
  - @dxos/echo@0.16.0
  - @dxos/plugin-attention@0.16.0
  - @dxos/plugin-illustrator@0.16.0
  - @dxos/plugin-markdown@0.16.0
  - @dxos/plugin-sheet@0.16.0
  - @dxos/app-framework@0.16.0
  - @dxos/app-graph@0.16.0
  - @dxos/app-toolkit@0.16.0
  - @dxos/react-ui-attention@0.16.0
  - @dxos/react-ui-form@0.16.0
  - @dxos/react-ui-list@0.16.0
  - @dxos/compute@0.16.0
  - @dxos/echo-react@0.16.0
  - @dxos/diagram@0.16.0
  - @dxos/effect@0.16.0
  - @dxos/invariant@0.16.0
  - @dxos/keys@0.16.0
  - @dxos/util@0.16.0
  - @dxos/ui-theme@0.16.0

## 0.15.0

### Patch Changes

- 3d151fc: In `@dxos/react-ui-canvas`, the view has a fit mode: Fit frames the scene and keeps it framed, refitting once a resize settles and on opening another scene, until the viewer pans or zooms. `SceneView.Root` takes `initialDisplay` / `onDisplayChange` (`SceneDisplay`: snap, guides, fit) so a host can restore and persist those toggles, and a view opens in fit mode unless restored otherwise. A read-only view floats its panels. A link caption on a horizontal run is shortened with an ellipsis to fit between the run's ends, its full text as a tooltip. The camera readout shows only the zoom.

  In `@dxos/plugin-canvas`, the plugin moves to the `beta` tier. A canvas's view is the viewer's own, kept in one view-state object per canvas: read-only, floating panels, grid, guides, fit and camera; the `dockPanels` setting is gone. The drawing menu now lists Read only and Dock/Float panels. A drawing's canvas record may set `readonly` as the default for viewers who have not chosen. A canvas in the section role (a document's embed) is read-only, shows the drawing without its palette or panels, and takes a 3:2 height. The DXOS Architecture space template seeds its drawings, read-only by default, from diagrams laid out ahead of time (`compiled.json`, kept current by a test), plus Composer, DXOS and EDGE documents that link and embed them.

  In `@dxos/plugin-space`, the create-space dialog closes as soon as it is submitted (a failed create is a toast) and its template list aligns with its fields; the collection article is a panel with a Filter… toolbar over a scrolling column of objects, their icons in the hue's text colour; the delete-space dialog's actions sit in `Dialog.Footer`.

  In `@dxos/react-ui`, a field in a toolbar no longer overflows it, and a dialog's action bar has the dialog gutter above as well as below.

  In `@dxos/plugin-registry`, the load-plugin dialog's action sits in `Dialog.Footer`.

- Updated dependencies [0a55936]
- Updated dependencies [3d151fc]
- Updated dependencies [311d611]
- Updated dependencies [008b18c]
- Updated dependencies [ab27b41]
- Updated dependencies [9b2a2c0]
- Updated dependencies [94ec06d]
- Updated dependencies [647b4bd]
- Updated dependencies [419bf9a]
- Updated dependencies [3aed53a]
- Updated dependencies [ed8df23]
- Updated dependencies [0f6457d]
- Updated dependencies [94d4f85]
- Updated dependencies [b6ae19d]
- Updated dependencies [b82150a]
- Updated dependencies [0d81167]
- Updated dependencies [71fc002]
- Updated dependencies [1b33a84]
- Updated dependencies [16bde33]
- Updated dependencies [417247b]
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
  - @dxos/react-ui-canvas@0.15.0
  - @dxos/react-ui@0.15.0
  - @dxos/echo@0.15.0
  - @dxos/compute@0.15.0
  - @dxos/diagram@0.15.0
  - @dxos/plugin-illustrator@0.15.0
  - @dxos/app-framework@0.15.0
  - @dxos/plugin-markdown@0.15.0
  - @dxos/app-toolkit@0.15.0
  - @dxos/echo-react@0.15.0
  - @dxos/plugin-attention@0.15.0
  - @dxos/react-ui-form@0.15.0
  - @dxos/app-graph@0.15.0
  - @dxos/react-ui-attention@0.15.0
  - @dxos/react-ui-list@0.15.0
  - @dxos/effect@0.15.0
  - @dxos/util@0.15.0
  - @dxos/invariant@0.15.0
  - @dxos/keys@0.15.0
  - @dxos/ui-theme@0.15.0

## 0.14.0

### Minor Changes

- fd09131: `SceneView` docks its properties and layers panels by default: a column beside the canvas (which narrows rather than sitting under them) holding an accordion with one section per panel, any number open, the column scrolling them together. `SceneView.Root` takes `panels` (`PanelMode`: `'docked'` | `'floating'`) to float them back over the canvas instead; `Properties` and `LayersPanel` take `docked`. The layers toolbar's delete and merge actions move into a menu at its end. A new `SceneView.About` adds a dock-only section below the layers with the scene's object counts (`About` is the panel itself). In Composer, a canvas drawing's menu offers "Dock panels" / "Float panels", stored as the canvas setting `dockPanels`.

  In `@dxos/react-ui`, `Toolbar` adds no gap or inline padding of its own (its items carry their own spacing, and a `ToggleGroup` in a toolbar drops its gap to match), and an `Accordion` item's icon and caret sit in `Block`s rather than custom padding, and list rows in a container with no gutter lose their rounded corners. In `@dxos/react-ui-form`, a `Form.Viewport` without `scroll` pads its block axis as the scrolling one does, so a form in a host that scrolls it still ends a gutter in.

- 508be04: The scene shape is now a frame. Breaking: the built-in node type `scene` is renamed `frame` (palette name "Frame", shortcut F), with `PortalNode` → `FrameNode`, `isPortalNode` → `isFrameNode` and `PortalNodeView` → `FrameNodeView`; the node's `scene` field (its child scene id) is unchanged, and drawings saved with `type: 'scene'` are not migrated. A node type may define `hostOpen`, the host's own way to open a node of it: opening (double-click, Enter, the open control) calls it instead of drilling in, and auto-drill passes such a node by. A node type may also define `toolbar`, controls drawn above the node, flush with its right edge and at screen size, shown while the node is hovered or selected. The canvas clips rather than hides its overflow, so focusing an editor in a node no longer scrolls the canvas out from under the camera. A frame always draws its border, and one the host opens itself is never faded as the scene being zoomed into. A node's embedded content (marked `data-scene-overlay`) is live only while the node is active (`SceneViewAtoms.active`, `NodeViewProps.active`): a click on the node activates it, and selecting anything else or Escape deactivates it. Inactive, a press anywhere moves the node; active, a press on the content starts no move (so its controls receive their clicks), a double-click there does not open the node, and the wheel is the content's where it has something to scroll. Presses inside a portal the content opens (a menu) no longer reach the node.

  In `@dxos/plugin-canvas`, a frame holds either its own nested scene or a referenced ECHO object: `CanvasSceneNode.drawing` is replaced by `CanvasFrameNode.object` (any object, picked in the properties panel) and `role` (`card`, `section` or `article`; unset is a card). A canvas drawing is embedded as a scene, as linked drawings were; any other object renders as its surface of that role, with a floating toolbar whose button opens the object in the app. Selecting the frame, or focusing within it, gives the object's surface attention, so its own toolbar acts. The object picker lists only user objects (those the navtree shows), not system objects such as space properties or canvases.

  In `@dxos/react-ui-form`, the object picker's popup is as wide as its field rather than growing to its longest option.

  In `@dxos/react-ui`, a `Card.Root` with `border={false}` also drops its corner radius, as its prop always described, so a card framed by its host shows no rounding of its own.

### Patch Changes

- b0e4b60: In `@dxos/react-ui-canvas`, a link may carry `text`, drawn at the middle of its route on an opaque rounded backdrop. Guides and borderless shapes are off the lattice: they occupy no cells, move and resize freely, and do not block gutter routes. A nested scene routes on its parent's lattice, so its links no longer jump when it settles. On a lattice a smart link takes the side-centre ports whose gutter route bends least (a pinned port stays pinned), and the gutter search runs on a binary heap. A label's or note's lines are a whole number of minor grid units tall, padded a grid unit either side, and a guide's text takes the default colour. `SceneView.Root`'s `readonly` now also prevents selection and hides the selection frame, ports, the actions bar, the Properties and Layers panels, the grid and the lattice guides.

  In `@dxos/plugin-canvas`, a laid-out illustrator diagram draws on the canvas lattice as it renders: each connector binds to its boxes as a `smart` link carrying its caption as `text`, and a group is a guide titled at its top-left corner on a `Backdrop` layer below the shapes. A linked drawing's own frames open the drawings they show, so drawings nest to any depth. A frame's object resolves through the canvas's database, and its role field appears as soon as an object is picked. Read-only is the viewer's own, kept in the canvas's view state and toggled from the drawing's menu (Read only / Edit drawing). The plugin offers a "DXOS Architecture" space template: multi-level Composer and EDGE architecture diagrams (from `docs/diagrams/*.dx`) seeded as nested canvas drawings, which the `Architecture` stories also load, read-only by default. Composer enables the plugin by default.

  In `@dxos/diagram`, a group frame's margin is the same on every side, with its title inside the top margin, and a diagram with an explicit `grid` keeps every box on it: extra space between groups is whole cells.

  In `@dxos/react-ui-form`, picking a reference in `RefField` commits it, so an auto-saving form saves the pick at once rather than on the next field's edit.

- Updated dependencies [0715304]
- Updated dependencies [b0e4b60]
- Updated dependencies [fd09131]
- Updated dependencies [508be04]
- Updated dependencies [929d683]
- Updated dependencies [347546a]
- Updated dependencies [8bd0c5b]
- Updated dependencies [30b3bd3]
- Updated dependencies [3c4d73d]
- Updated dependencies [b06ee26]
- Updated dependencies [1eed6b1]
- Updated dependencies [6847fe2]
- Updated dependencies [1819960]
- Updated dependencies [eb5d14d]
- Updated dependencies [4820c02]
- Updated dependencies [b07f49f]
  - @dxos/app-framework@0.14.0
  - @dxos/react-ui-canvas@0.14.0
  - @dxos/diagram@0.14.0
  - @dxos/react-ui-form@0.14.0
  - @dxos/react-ui@0.14.0
  - @dxos/react-ui-list@0.14.0
  - @dxos/plugin-illustrator@0.14.0
  - @dxos/echo@0.14.0
  - @dxos/effect@0.14.0
  - @dxos/ui-theme@0.14.0
  - @dxos/plugin-attention@0.14.0
  - @dxos/app-toolkit@0.14.0
  - @dxos/app-graph@0.14.0
  - @dxos/react-ui-attention@0.14.0
  - @dxos/echo-react@0.14.0
  - @dxos/invariant@0.14.0
  - @dxos/keys@0.14.0
  - @dxos/util@0.14.0

## 0.13.0

### Patch Changes

- Updated dependencies [d2a6aad]
- Updated dependencies [162fd6d]
- Updated dependencies [aad3e41]
- Updated dependencies [597cdb7]
- Updated dependencies [bb2b672]
- Updated dependencies [cb1e218]
- Updated dependencies [1ef899b]
- Updated dependencies [5a27d5c]
- Updated dependencies [32f32a0]
- Updated dependencies [469e7f7]
- Updated dependencies [665261a]
- Updated dependencies [234ef9c]
- Updated dependencies [014996b]
- Updated dependencies [22adb53]
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
- Updated dependencies [2d5050d]
- Updated dependencies [8ebe8d6]
- Updated dependencies [7715216]
- Updated dependencies [1b37aa8]
- Updated dependencies [1737cad]
- Updated dependencies [321c99f]
- Updated dependencies [6a7bed4]
- Updated dependencies [3022878]
- Updated dependencies [2550779]
- Updated dependencies [c2a300a]
- Updated dependencies [17008f0]
- Updated dependencies [6ea9d4d]
- Updated dependencies [4f8e566]
- Updated dependencies [a449958]
- Updated dependencies [49731e1]
  - @dxos/react-ui@0.13.0
  - @dxos/echo@0.13.0
  - @dxos/react-ui-canvas@0.13.0
  - @dxos/util@0.13.0
  - @dxos/diagram@0.13.0
  - @dxos/plugin-illustrator@0.13.0
  - @dxos/app-toolkit@0.13.0
  - @dxos/app-framework@0.13.0
  - @dxos/effect@0.13.0
  - @dxos/invariant@0.13.0
  - @dxos/ui-theme@0.13.0

## 0.12.0

### Patch Changes

- eac44e9: The canvas shows its toolbars, palette and debug readout by default; settings saved before the default existed hold neither key and are read as shown. A `CanvasArticle` story opens a drawing through the illustrator's article surface.

  In the session Gantt, a task lane breaks where its task was put down and picked up again, so a question and the work after its answer draw as separate runs with the wait between them left open. `Lane` gains optional `gaps`, which the Gantt mapping splits the lane's segments around.

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
- Updated dependencies [6f5c6fc]
- Updated dependencies [34a8433]
- Updated dependencies [bd6ba8e]
- Updated dependencies [0fe00c5]
- Updated dependencies [2d4107f]
- Updated dependencies [75971ad]
- Updated dependencies [3958355]
- Updated dependencies [fd23a8b]
- Updated dependencies [5262408]
- Updated dependencies [d194929]
- Updated dependencies [6ef35a6]
- Updated dependencies [d17d75a]
- Updated dependencies [557e243]
- Updated dependencies [ea11703]
- Updated dependencies [5305365]
- Updated dependencies [b2caee6]
- Updated dependencies [9baf25f]
- Updated dependencies [9a36b1e]
- Updated dependencies [34f7d92]
- Updated dependencies [dcf911b]
- Updated dependencies [b63506b]
- Updated dependencies [dd17e57]
- Updated dependencies [6d28380]
- Updated dependencies [6af89f4]
- Updated dependencies [329faa0]
- Updated dependencies [d770fe7]
- Updated dependencies [da37a13]
- Updated dependencies [0a01ff7]
- Updated dependencies [1c995c4]
- Updated dependencies [6f4a887]
- Updated dependencies [318d610]
- Updated dependencies [ab56cfe]
- Updated dependencies [1aabb03]
- Updated dependencies [119f317]
- Updated dependencies [18758f9]
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
- Updated dependencies [6c25ed3]
- Updated dependencies [2e4c299]
- Updated dependencies [a3b6ef0]
- Updated dependencies [4c55b5d]
- Updated dependencies [b02fe16]
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
- Updated dependencies [b9d72bb]
- Updated dependencies [eeff74c]
- Updated dependencies [967b130]
- Updated dependencies [3e9a10f]
- Updated dependencies [8ea2bf9]
- Updated dependencies [8ca2ac7]
- Updated dependencies [0f0acca]
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
- Updated dependencies [b600f72]
- Updated dependencies [3294b3d]
- Updated dependencies [99e323d]
- Updated dependencies [ea11703]
- Updated dependencies [cc45381]
- Updated dependencies [bcfe4c5]
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
- Updated dependencies [2513a52]
- Updated dependencies [17ed864]
- Updated dependencies [1d6f730]
- Updated dependencies [b125655]
- Updated dependencies [f4c2702]
- Updated dependencies [dea5df9]
- Updated dependencies [ca04eca]
- Updated dependencies [7407d65]
- Updated dependencies [318bbad]
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
- Updated dependencies [72b2984]
- Updated dependencies [5dedae9]
- Updated dependencies [693d1b4]
- Updated dependencies [32584c9]
- Updated dependencies [32353e6]
- Updated dependencies [559acfa]
- Updated dependencies [631df48]
- Updated dependencies [d205e96]
- Updated dependencies [e8088ea]
- Updated dependencies [bb94124]
- Updated dependencies [928e0b2]
- Updated dependencies [1a3de22]
- Updated dependencies [5d816a6]
- Updated dependencies [4c5b2c7]
- Updated dependencies [f9816c0]
- Updated dependencies [6fd2a5d]
- Updated dependencies [525aee0]
- Updated dependencies [a20d4d9]
- Updated dependencies [40b50c2]
- Updated dependencies [f112c37]
- Updated dependencies [8048e42]
- Updated dependencies [520c34f]
- Updated dependencies [85bdad2]
- Updated dependencies [a1d42c4]
- Updated dependencies [d094b1e]
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
  - @dxos/ui-theme@0.12.0
  - @dxos/react-ui@0.12.0
  - @dxos/effect@0.12.0
  - @dxos/react-ui-canvas@0.12.0
  - @dxos/diagram@0.12.0
  - @dxos/plugin-illustrator@0.12.0
  - @dxos/util@0.12.0
  - @dxos/invariant@0.12.0
