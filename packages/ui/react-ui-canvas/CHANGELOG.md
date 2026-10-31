# @dxos/react-ui-canvas

## 0.17.0

### Minor Changes

- 5ee83e7: `Canvas.About` and `AboutInspector` are removed; the Views panel's rows carry the counts. Deleting an Object with its instances (`removeComposite`) also deletes, in the same undo step, the records only those instances pointed at, and Ungroup brings an Object's animation tracks back out onto the new nodes, placed and sized as the Instance drew them. The floating inspector panel is one scrolling list again; only the docked panel splits Properties from the other sections. In plugin-canvas, `CanvasOperation.ImportTldraw` takes `snap` (true by default), aligning the imported shapes' positions and sizes to the canvas grid. A tldraw frame now becomes a labelled outline rectangle on a frames layer under its shapes, which stay in the same View (tldraw has no nested scenes), so arrows into the frame stay bound. A plain (non-smart) line bound to a node without a port now points at the node's centre and stops at its outline; smart lines still attach at ports.
- c1c6cf4: Breaking: the scene container is renamed View across the API — `SceneId` → `ViewId`, `SceneStore` → `ViewStore`, `SceneKind` → `ViewKind`, `Scene` → `View`, `SceneBuilder` → `ViewBuilder`, `useSceneProjection` → `useViewProjection`, the store's `scenes`/`scene(id)` → `views`/`view(id)` — and the `frame` node type is now `view` (`FrameNode` → `ViewNode`, `isFrameNode` → `isViewNode`); stored `frame` nodes load as `view`. react-ui-canvas-compute and plugin-canvas follow (`boardSceneId` → `boardViewId`, `readScenes`/`writeScenes` → `readViews`/`writeViews`, `ROOT_SCENE_ID` → `ROOT_VIEW_ID`, `DYNAMIC_SCENE_ID` → `DYNAMIC_VIEW_ID`).

  The canvas's commands live in a React-free `CanvasController` (`createCanvasController`), organised by aspect (selection, editing, tools, time, navigation, look), and its parts read their own state, so panning or a selection change no longer re-renders panels that do not show it. A read-only canvas pastes, cuts and deletes nothing.

  The new `Canvas.Views` panel shows the drawing's Views, nodes, links and placed Objects as a tree: a row selects on the canvas (opening an Object in isolation for its contents), the root row selects everything, a double-click opens a View, a drag restacks siblings, and a filter narrows the rows. Group (⌘G) makes an anonymous Object and one Instance in place of the selection, which joins the Objects library once named or placed again; Ungroup (⇧⌘G) puts it back. `groupIntoView` and the Compose button are removed, and deleting the last node that opens a View or an anonymous Object deletes that record, as stores do on load (`createMemoryStore`'s `root` option, plugin-canvas on bind).

  The inspector panel shows the same sections docked or floating, Properties above a draggable seam and the rest below (`InspectorSectionDef.pane`; `InspectorSectionDef.show` and `InspectorPanel.Root`'s `selected` are removed); selection actions sit in its toolbar (`InspectorPanel.Root` `actions`). New shapes: `cloud` (key C, with a bump count) and a regular `polygon` (key N, with a side count), drawn through `NodeDef.silhouette`; every node takes a `rotation` in 15° steps. The timeline's key actions move into one menu, and the scene-tree fixtures move from `builder/testing` to `testing`.

- a5742a9: `createDynamicProjection` accepts `layers` and `link.layer`, so a laid-out graph can draw a backdrop layer (such as package frames) under its nodes and put its links on a chosen layer.
- e82b80a: ECHO adds content migrations for formats stored inside an object field: `Annotation.ContentVersionAnnotation` marks the field holding the version, `Migration.defineContent` declares one step, `db.runMigrations` applies each object's chain once, writing only the records that change, and `Migration.upgradeContent` applies it in memory. The canvas is the first user: every stored drawing moves from `dxos.org/scene/1` to `dxos.org/scene/2` on first start (a frame's `role` moving into its `link`), so a client on an earlier release cannot open a migrated drawing until it updates, and from this release a drawing saved by a newer Canvas plugin opens read-only. The canvas also gains a polyline shape and tool (Y) and a per-type edit mode entered by double-click (a label, or a polyline's draggable vertices), and Rounded and line style now draw the same on every shape.

  Breaking: `CanvasAtoms.editing` is an `Editing` union replacing `EditingPart`; the lattice snap toggle (`CanvasAtoms.lattice`, `toggleLattice`, Shift+G) is removed, since a lattice scene always snaps to its cells and shows no grid; and drawing variants match a canvas by format rather than by exact version string.

- e8029c3: Canvas undo and redo patch the store instead of restoring snapshots. Every edit is a commit of a `CanvasHistory` that records the store's heads before and after and the paths it wrote; undo writes a path back only while nobody has changed it since, and returns the view to the View path and selection the edit was made in. `Canvas.Root` takes `history` (from `useCanvasHistory`, or a `CreateHistory`); without one the canvas keeps a local history, so ⌘Z, ⇧⌘Z and the toolbar work standalone. Breaking: `Projection.snapshot`/`restore`, `withUndo`, `recordViews`, `recordStoreStep` and `CanvasAtoms.undo` are removed; a projection with a model of its own exposes it as `model` (a `VersionedSource`) and may implement `restored()`, and `useViewProjection` now takes `history`. `ViewStore.versions`, `VersionedSource`, `recordChanges` and `patchSource` are exported from `headless`.

  In plugin-canvas, a canvas in Composer records its edits on the app's `HistoryTracker` as `CanvasOperation.Patch`, scoped to the canvas, and agents can edit a canvas with `CanvasOperation.Apply` (intents); both are undoable, and `Apply` refuses a malformed intent (`isIntent`, exported from `headless`) or a canvas with no version history before it writes. The ECHO-backed store reads its past through Automerge heads. In app-framework, `UndoMapping` gains `merge` (fold merged invocations into one forward and re-derive the inverse) and `toast` (false records an entry without the deck's undo toast).

  Drawing conversion copies by default: `DrawingOperation.Convert` writes a new drawing beside the source (`replace: true` converts in place, as drawing.sh does) and names it in its output, and Composer's menu offers "Copy as …" for each variant, opening the copy. A plugin can register an `IllustratorCapabilities.Converter` for a pair of variants, which `Convert` uses over the generic scene replay (`IllustratorModel.convertByScene`). plugin-canvas registers one for tldraw to canvas that converts a DSL-managed drawing generically and maps a hand-drawn one shape by shape; breaking: `CanvasOperation.ImportTldraw` and its "Copy as canvas" action are removed in its favour.

  The canvas's Snap and Lattice toggles move to the bottom-right bar beside the grid and guides, and the centre action bar hides on a canvas too narrow for it. A link's `style.fontSize` sets its caption's size (unset is `LINK_FONT_SIZE`, 14), and a caption on a straight sloped line is shortened only when it does not fit the line's run. A rounded regular polygon rounds its corners by the look's rounded radius; a `NodeDef.silhouette` is given that radius in px. A polygon's `params.fit` sets how it sits in its frame: `frame` (the default) fills the frame, `circle` puts its vertices on the circle that fits it; `polygonPath` takes an options bag. The bottom-right bar ends with the theme picker. A form field override can control a nested group's `open` state (`onOpenChange`); the canvas properties panel takes `groups`, and plugin-canvas keeps which groups are open in its view state. Breaking: `ThemePanel` is renamed `DisplayPanel`. Breaking: a polygon's `sides` and `fit` and a cloud's `bumps` move into the node's `params` (`PolygonParams`, `CloudParams`), shown as the type's own group in the properties panel; stored drawings read in the new shape through `withLegacyParams`.

- 94df7d2: Dynamic projection edges can carry their own caption, end markers and line style (`GraphEdge.text`, `ends`, `style`), so one graph can draw several kinds of edge; an edge without them keeps `DynamicOptions.link`.
- df1380a: The dynamic projection lays a graph out on a lattice and orders it to read cleanly.

  - `DynamicOptions.lattice` places one node per lattice cell, draws the lattice guides, and snaps moved nodes onto free cells.
  - `DynamicOptions.arrange` chooses how ranked nodes take their cells:
    - `crossings` is the new default. Each rank is ordered to minimise edge crossings; previously nodes were in id order within each rank.
    - `rank` keeps that previous id order.
    - `routed` starts from `crossings`, then moves and swaps nodes to lower the cost of the links as they are routed through the lattice gutters.
    - `force` and `force-free` run a d3-force layout. `force` snaps the result to free cells; `force-free` leaves it where it came to rest. `DynamicOptions.force` tunes attraction, repulsion and repulsion range.
  - New exports: `improveSlots`, `routeCost` and `latticeEnds`.
  - Masonry draws a selected tile's ring on an overlay above the tile, so an opaque tile (such as a card) no longer hides it.
  - The markdown editor shows the link button (`decorateMarkdown`'s `renderLinkButton`) after bare URLs and `<url>` autolinks too, as it does for `[label](url)` links.

- 13bc40d: Feature maps are editable in Composer: create a feature on the map and name it in place, add an existing one from the toolbar, edit a card's name and description inline, set status or remove a feature from its card menu, draw and delete dependency arrows and remove boxes on the canvas, and add dependencies and link tasks from the feature article. Every edit runs the same operation an agent uses, and a refused edit (a dependency that would close a cycle) shows its message as a toast. The canvas dynamic projection accepts `onLink` and `onDelete` hooks, so a host can apply those edits to its own model instead of the projection's graph. `ObjectPicker` no longer pins its popup to a custom trigger's width, so a picker behind an icon button is readable.
- a1c19cc: Projects gains feature maps: `Feature` (status, two-level subfeatures, repo spec links, `DependsOn` and `Implements` relations), `Showcase` (a write-up with artifacts that `Demonstrates` a feature or task) and `FeatureMap` (a board with cards and canvas views), with operations agents use through the project skill. The canvas dynamic projection now accepts a node factory, a link style with arrow ends, and its own capabilities, so a host can render its own nodes in a drag-only view.

### Patch Changes

- df16fba: Popups (menus, selects, comboboxes, popovers) no longer draw a focus ring; the highlighted item shows where focus is. In the chat prompt, the placeholder is shortened to "/ for skills, @ for content", "Add an object" is renamed "Add object", and switching between the tasks and context drawers closes the open drawer before the other opens. The search and add-to-collection dialogs keep their input's inner padding. The prompt's command completions render as a react-ui-list Listbox in a popover above the editor, at most 8 rows tall, whose arrow keys stop at the first and last command instead of wrapping; Escape closes it and leaves focus in the editor. An editor no longer moves focus to its host on an Escape CodeMirror already acted on.

  A polyline locked while its vertices are being edited loses its vertex handles, Delete no longer removes a vertex from it, and a vertex drag the lock lands in the middle of neither previews nor commits a change.

- 40271d5: With snap on, moving and resizing a node land it on the major grid again, as the Snap button describes, rather than on the minor grid.
- 81d2cd2: Specs can declare the specs they build on (`uses` blocks, a plugin's `dependsOn`) and refer into them as `<spec id>#<item>`; the spec viewer links those references, marks broken ones and opens the target spec at the item. A plugin's Open Specification opens the spec as the main plank, and the Canvas plugin now publishes its spec. In the canvas, a link end's marker can be set back to None, and a View node cannot be grouped into or created inside an Object.
- 6030742: A tldraw drawing can be copied as a canvas: `CanvasOperation.ImportTldraw` maps its shapes to nodes, its arrows to links (bound ends stay attached to their nodes), and its frames to View nodes over Views of their own and its groups to anonymous Objects, then files the new drawing beside the original and opens it. The action ("Copy as canvas") appears on every tldraw drawing; plugin-tldraw takes no dependency on plugin-canvas. Rotation carries over; tldraw's clouds and regular polygons map to the canvas's own, and the shapes it has no match for become rectangles. `@dxos/react-ui-canvas/headless` now exports `composeSelection` and the other pure grouping helpers, so a host can group nodes without loading React.
- Updated dependencies [90a7f6e]
- Updated dependencies [c1f845f]
- Updated dependencies [82f2242]
- Updated dependencies [df16fba]
- Updated dependencies [e8029c3]
- Updated dependencies [1924a44]
- Updated dependencies [e343467]
- Updated dependencies [9a3313a]
- Updated dependencies [034e231]
- Updated dependencies [0590c11]
- Updated dependencies [9fe0e5c]
- Updated dependencies [1302e04]
- Updated dependencies [7067fec]
- Updated dependencies [bc50a90]
- Updated dependencies [39eb10b]
- Updated dependencies [aec19dd]
- Updated dependencies [a70fb5a]
- Updated dependencies [9bcc167]
- Updated dependencies [13bc40d]
- Updated dependencies [7751052]
- Updated dependencies [545ee73]
- Updated dependencies [9d66bcd]
- Updated dependencies [074e3e6]
- Updated dependencies [17a9e75]
- Updated dependencies [b46d89b]
- Updated dependencies [853663c]
- Updated dependencies [1f73ed2]
- Updated dependencies [691fe84]
- Updated dependencies [0166448]
- Updated dependencies [f86f10e]
- Updated dependencies [e99e717]
- Updated dependencies [bc5cea7]
- Updated dependencies [aa1cde1]
- Updated dependencies [4fe25ee]
- Updated dependencies [2cebedc]
- Updated dependencies [7da5d17]
- Updated dependencies [4be51c3]
- Updated dependencies [f299590]
- Updated dependencies [ca2a4a8]
- Updated dependencies [b159f41]
- Updated dependencies [bdb73fb]
- Updated dependencies [39f6b21]
- Updated dependencies [d00cc85]
- Updated dependencies [1a0fff1]
- Updated dependencies [c1c6cf4]
- Updated dependencies [6f27147]
- Updated dependencies [e67aa80]
- Updated dependencies [df65316]
  - @dxos/echo@0.17.0
  - @dxos/diagram@0.17.0
  - @dxos/react-ui@0.17.0
  - @dxos/react-ui-editor@0.17.0
  - @dxos/react-ui-form@0.17.0
  - @dxos/ui-editor@0.17.0
  - @dxos/react-ui-list@0.17.0
  - @dxos/ui-types@0.17.0
  - @dxos/effect@0.17.0
  - @dxos/ui-theme@0.17.0
  - @dxos/react-hooks@0.17.0

## 0.16.0

### Minor Changes

- 4be32be: `SceneView` is renamed `Canvas` (`SceneView.Canvas` is now `Canvas.Viewport`), and its inspectors sit in one `InspectorPanel` that docks beside the canvas or floats over it, with each inspector framed by an `InspectorSection`. Background dots now hold their size while the view moves, a trackpad swipe pans in both directions, each drawn frame opens onto a scene of its own, and drilling into an empty or nested frame zooms and returns level by level. A number field with a fractional step rounds to that step, and opacity is bounded to 0–1.

### Patch Changes

- 67f3f9f: Zooming into a frame crossfades the canvas grid into the frame's own grid, so the drill-in no longer swaps one grid for another. Text nodes use 1.5 line spacing with equal top and side margins, and their text no longer moves when editing starts.
- Updated dependencies [dc7785a]
- Updated dependencies [2f76f26]
  - @dxos/react-ui@0.16.0
  - @dxos/echo@0.16.0
  - @dxos/react-ui-editor@0.16.0
  - @dxos/react-ui-form@0.16.0
  - @dxos/react-ui-list@0.16.0
  - @dxos/ui-editor@0.16.0
  - @dxos/diagram@0.16.0
  - @dxos/effect@0.16.0
  - @dxos/react-hooks@0.16.0
  - @dxos/ui-theme@0.16.0
  - @dxos/ui-types@0.16.0

## 0.15.0

### Minor Changes

- 0a55936: The scene engine animates: composite objects, a timeline, and agent-written generators.

  - Composite objects: a scene marked `kind: 'composite'` drawn by `instance` nodes; group as object, ungroup, make unique and place; `SceneView.Objects` lists them and opens one in isolation.
  - Timeline: `Scene.timeline` of keyed tracks with easing, `sampleScene(scene, t)`, an animated projection that turns edits away from the start into keys, a per-view clock (`SceneViewAtoms.clock`), and `SceneView.Timeline` with space, `,` `.` `[` `]` and `K`.
  - Generators: a `generator` node runs agent-written code in a worker (`@dxos/react-ui-canvas/generator-worker`) at a fixed 120 Hz with seeded random, checkpoints and a step budget, drawing `Shape` lists; the motion library is `@dxos/react-ui-canvas/motion`.
  - `SceneView.Root exportable` publishes the clock for `scripts/render-story.mjs`, which now seeks it frame by frame; new `path` node type and `film` theme.
  - `@dxos/brand/paths` exports the DXOS lockup as path data (`DXOS_HORIZONTAL_LOCKUP`), which `DXOSHorizontalType` now draws from.
  - plugin-canvas adds an image shape (palette key `I`) linked by URL in its properties.
  - `FrameHeader` (the title, caption, counter and playback strip over a sequence of frames) moves into `@dxos/react-ui-canvas` from plugin-canvas's `SequenceHeader`.

- 3d151fc: In `@dxos/react-ui-canvas`, the view has a fit mode: Fit frames the scene and keeps it framed, refitting once a resize settles and on opening another scene, until the viewer pans or zooms. `SceneView.Root` takes `initialDisplay` / `onDisplayChange` (`SceneDisplay`: snap, guides, fit) so a host can restore and persist those toggles, and a view opens in fit mode unless restored otherwise. A read-only view floats its panels. A link caption on a horizontal run is shortened with an ellipsis to fit between the run's ends, its full text as a tooltip. The camera readout shows only the zoom.

  In `@dxos/plugin-canvas`, the plugin moves to the `beta` tier. A canvas's view is the viewer's own, kept in one view-state object per canvas: read-only, floating panels, grid, guides, fit and camera; the `dockPanels` setting is gone. The drawing menu now lists Read only and Dock/Float panels. A drawing's canvas record may set `readonly` as the default for viewers who have not chosen. A canvas in the section role (a document's embed) is read-only, shows the drawing without its palette or panels, and takes a 3:2 height. The DXOS Architecture space template seeds its drawings, read-only by default, from diagrams laid out ahead of time (`compiled.json`, kept current by a test), plus Composer, DXOS and EDGE documents that link and embed them.

  In `@dxos/plugin-space`, the create-space dialog closes as soon as it is submitted (a failed create is a toast) and its template list aligns with its fields; the collection article is a panel with a Filter… toolbar over a scrolling column of objects, their icons in the hue's text colour; the delete-space dialog's actions sit in `Dialog.Footer`.

  In `@dxos/react-ui`, a field in a toolbar no longer overflows it, and a dialog's action bar has the dialog gutter above as well as below.

  In `@dxos/plugin-registry`, the load-plugin dialog's action sits in `Dialog.Footer`.

- 311d611: Pointing at a scene view's floating panel, or at a popup it opens, no longer highlights the shapes beneath it.

  A `Combobox` popup with a search field now frames the field above a separate scrolling list, so options no longer scroll beneath it and the scrollbar starts below it; a create form that replaces the search keeps the same frame. Typing and pressing Enter in the same frame now picks the first match: the highlight moves off a filtered-out option as the list narrows rather than an effect later.

  `@dxos/app-toolkit/ObjectCombobox` picks one object of a space: the objects a user finds in the navigator or a Database section (`TypeOptions.filterListedObjects`: a registered user-facing type, not archived, not a space's root collection), sorted by label, each with its type icon, an unnamed object under its type's placeholder. `ObjectCombobox.toOptions` builds the same options for a form's ref field, which the canvas's object picker now uses. `RefOption` takes an optional `icon` and `iconHue`, which `ObjectPicker` renders at the start of the row.

  app-toolkit's UI components each live in their own folder, whose module is the namespace its subpath exports (as `@dxos/react-ui` does), replacing the root re-export shims; the subpaths and the namespaces they export are unchanged.

- 94fb343: Add `interpolateCamera`, which returns the camera at any point along the smooth zoom-and-pan path between two cameras, so a frame-by-frame renderer can animate the camera deterministically; `animateCamera` now uses it.

### Patch Changes

- 008b18c: A read-only `SceneView` shows no floating panels: `SceneView.About` renders only as a dock section and takes no props. The view's background now sits on the element `SceneView.Root`'s `classNames` styles, so a host can replace it (e.g. `bg-transparent` for a card preview). A lattice scene no longer draws the snap grid while its lattice is on, since shapes land on its cells rather than the grid lines, and the cells are drawn fainter. The plugin registry's detail scrolls when it is longer than its panel, including in the deck's detail companion.
- Updated dependencies [3b03db7]
- Updated dependencies [3d151fc]
- Updated dependencies [ab27b41]
- Updated dependencies [9b2a2c0]
- Updated dependencies [647b4bd]
- Updated dependencies [419bf9a]
- Updated dependencies [3aed53a]
- Updated dependencies [ed8df23]
- Updated dependencies [0f6457d]
- Updated dependencies [94d4f85]
- Updated dependencies [b6ae19d]
- Updated dependencies [0d81167]
- Updated dependencies [71fc002]
- Updated dependencies [1b33a84]
- Updated dependencies [16bde33]
- Updated dependencies [1bc475e]
- Updated dependencies [55bdf55]
- Updated dependencies [098a536]
- Updated dependencies [25af912]
- Updated dependencies [7b47951]
- Updated dependencies [8190cc5]
- Updated dependencies [60ef4ec]
- Updated dependencies [2b6a93a]
  - @dxos/ui-editor@0.15.0
  - @dxos/react-ui@0.15.0
  - @dxos/echo@0.15.0
  - @dxos/diagram@0.15.0
  - @dxos/react-ui-editor@0.15.0
  - @dxos/react-ui-form@0.15.0
  - @dxos/react-ui-list@0.15.0
  - @dxos/effect@0.15.0
  - @dxos/react-hooks@0.15.0
  - @dxos/ui-theme@0.15.0
  - @dxos/ui-types@0.15.0

## 0.14.0

### Minor Changes

- b0e4b60: In `@dxos/react-ui-canvas`, a link may carry `text`, drawn at the middle of its route on an opaque rounded backdrop. Guides and borderless shapes are off the lattice: they occupy no cells, move and resize freely, and do not block gutter routes. A nested scene routes on its parent's lattice, so its links no longer jump when it settles. On a lattice a smart link takes the side-centre ports whose gutter route bends least (a pinned port stays pinned), and the gutter search runs on a binary heap. A label's or note's lines are a whole number of minor grid units tall, padded a grid unit either side, and a guide's text takes the default colour. `SceneView.Root`'s `readonly` now also prevents selection and hides the selection frame, ports, the actions bar, the Properties and Layers panels, the grid and the lattice guides.

  In `@dxos/plugin-canvas`, a laid-out illustrator diagram draws on the canvas lattice as it renders: each connector binds to its boxes as a `smart` link carrying its caption as `text`, and a group is a guide titled at its top-left corner on a `Backdrop` layer below the shapes. A linked drawing's own frames open the drawings they show, so drawings nest to any depth. A frame's object resolves through the canvas's database, and its role field appears as soon as an object is picked. Read-only is the viewer's own, kept in the canvas's view state and toggled from the drawing's menu (Read only / Edit drawing). The plugin offers a "DXOS Architecture" space template: multi-level Composer and EDGE architecture diagrams (from `docs/diagrams/*.dx`) seeded as nested canvas drawings, which the `Architecture` stories also load, read-only by default. Composer enables the plugin by default.

  In `@dxos/diagram`, a group frame's margin is the same on every side, with its title inside the top margin, and a diagram with an explicit `grid` keeps every box on it: extra space between groups is whole cells.

  In `@dxos/react-ui-form`, picking a reference in `RefField` commits it, so an auto-saving form saves the pick at once rather than on the next field's edit.

- fd09131: `SceneView` docks its properties and layers panels by default: a column beside the canvas (which narrows rather than sitting under them) holding an accordion with one section per panel, any number open, the column scrolling them together. `SceneView.Root` takes `panels` (`PanelMode`: `'docked'` | `'floating'`) to float them back over the canvas instead; `Properties` and `LayersPanel` take `docked`. The layers toolbar's delete and merge actions move into a menu at its end. A new `SceneView.About` adds a dock-only section below the layers with the scene's object counts (`About` is the panel itself). In Composer, a canvas drawing's menu offers "Dock panels" / "Float panels", stored as the canvas setting `dockPanels`.

  In `@dxos/react-ui`, `Toolbar` adds no gap or inline padding of its own (its items carry their own spacing, and a `ToggleGroup` in a toolbar drops its gap to match), and an `Accordion` item's icon and caret sit in `Block`s rather than custom padding, and list rows in a container with no gutter lose their rounded corners. In `@dxos/react-ui-form`, a `Form.Viewport` without `scroll` pads its block axis as the scrolling one does, so a form in a host that scrolls it still ends a gutter in.

- 508be04: The scene shape is now a frame. Breaking: the built-in node type `scene` is renamed `frame` (palette name "Frame", shortcut F), with `PortalNode` → `FrameNode`, `isPortalNode` → `isFrameNode` and `PortalNodeView` → `FrameNodeView`; the node's `scene` field (its child scene id) is unchanged, and drawings saved with `type: 'scene'` are not migrated. A node type may define `hostOpen`, the host's own way to open a node of it: opening (double-click, Enter, the open control) calls it instead of drilling in, and auto-drill passes such a node by. A node type may also define `toolbar`, controls drawn above the node, flush with its right edge and at screen size, shown while the node is hovered or selected. The canvas clips rather than hides its overflow, so focusing an editor in a node no longer scrolls the canvas out from under the camera. A frame always draws its border, and one the host opens itself is never faded as the scene being zoomed into. A node's embedded content (marked `data-scene-overlay`) is live only while the node is active (`SceneViewAtoms.active`, `NodeViewProps.active`): a click on the node activates it, and selecting anything else or Escape deactivates it. Inactive, a press anywhere moves the node; active, a press on the content starts no move (so its controls receive their clicks), a double-click there does not open the node, and the wheel is the content's where it has something to scroll. Presses inside a portal the content opens (a menu) no longer reach the node.

  In `@dxos/plugin-canvas`, a frame holds either its own nested scene or a referenced ECHO object: `CanvasSceneNode.drawing` is replaced by `CanvasFrameNode.object` (any object, picked in the properties panel) and `role` (`card`, `section` or `article`; unset is a card). A canvas drawing is embedded as a scene, as linked drawings were; any other object renders as its surface of that role, with a floating toolbar whose button opens the object in the app. Selecting the frame, or focusing within it, gives the object's surface attention, so its own toolbar acts. The object picker lists only user objects (those the navtree shows), not system objects such as space properties or canvases.

  In `@dxos/react-ui-form`, the object picker's popup is as wide as its field rather than growing to its longest option.

  In `@dxos/react-ui`, a `Card.Root` with `border={false}` also drops its corner radius, as its prop always described, so a card framed by its host shows no rounding of its own.

- 929d683: The scene engine's node types are defined by the registry: a type declares its text `parts` and `fields`, may `extend` a prototype, and its `defaultSize` is in major grid cells. The UML class shape moved out of the built-ins into the new `@dxos/plugin-uml`. Breaking: hosts that set `defaultSize` in pixels must give it in major cells, and `sceneBounds`, `DEFAULT_EXTENT` and the drawn scene frame are removed. Every nested scene keeps its own scale, so a shape is the same size at the same zoom on every level; Fit frames the shapes and never zooms past 100%, a new Actual size control returns to 100%, entering and leaving a scene take a second, and the layer around a scene being zoomed into fades out. A scene shape showing its contents draws them live at any size. Scene shapes look like rectangles, with an editable label, ports and a zoom-in control, and can show another canvas drawing. Styles are a hue and a tone from 0 to 3. Guides and the lattice have their own toggles. Links and their ends scale with the zoom. `SceneView.Root` can start from a saved camera and report camera changes (`initialCamera`, `onCameraChange`). `SceneBuilder` builds fixtures declaratively and rejects duplicate ids. Canvas drawings keep their camera position, have Lattice and Grid size settings in the Properties companion, and migrate content saved under the old `scene:root` id.
- 347546a: Scenes have layers. `Scene.layers` holds ordered `Layer`s (a scene that names none has one, `DEFAULT_LAYER`), and every node and link is on one (`layer`); created, pasted and fixture-built elements name theirs, and adding a layer first pins elements that name none to the layer they are drawn on (`pinLayers`), so a new bottom layer never takes them. `@dxos/plugin-canvas` names the layers of a drawing saved before layers when it loads. Elements paint by layer, then by their own order, and a hidden layer is neither drawn nor hit. `SceneView.Layers` (`LayersPanel`) selects several layers at once, adds (at the end of the list), deletes, merges the selected layers into the top-most of them, shows or hides, reorders and renames them in place; new shapes go on the top-most selected layer, and the properties panel picks an element's layer. New intents `layer` and `removeLayer` carry the edits, so each is one undo step. `CellGrid` (with `createCellGridAtoms`, `toggleCell`, `ToggleMode` and its headers) is no longer exported from `@dxos/react-ui-canvas`: it moved into `@dxos/plugin-sequencer`, its only user.

  In `@dxos/react-ui`, `Editable`'s pencil opens the field with one click whatever the activation gesture, the field shows a save button (a green check) while editing, and inside a list row the preview takes the row's hover and its presses, so the list keeps its arrow keys. `Listbox.Root` takes `selectionMode='extended'` (Cmd/Ctrl- or Shift-click adds to the selection), and `Listbox.Content` takes `padBlock` to pad the list above and below by its gutter. In `@dxos/react-ui-list`, `OrderedList.Root` takes `multiple`, so `value` and `onValueChange` carry an array of ids.

- 8bd0c5b: Links take a line style (a hue from the style grid's outline row, and solid, dashed or dotted), and their ends, arrow, triangle and circle, are a quarter of a major grid cell drawn in the line's hue; links scale with the zoom. Breaking: `Link.directed` is removed in favour of `ends: { end: 'arrow' }` (plugin-canvas reads saved `directed` links as an end arrow). Tones 1 to 3 run strongest to lightest (the hue's 500, 400 and 300), the style grid offers sky in place of pink, node frames have a 2px border and labels default to 18px. New shapes are sized in major grid cells (a rectangle 2×1, an ellipse 2×2) and a node made by dropping a link is centred on the release point, selected with its link. The properties panel gains a toolbar with a flip-direction button for links and shows a scene shape's resolved Show contents; Fit leaves two major cells of margin, the navigation bar's Up and root are icons, and the depth label is gone.
- 30b3bd3: The scene engine is now the root export of `@dxos/react-ui-canvas` (`@dxos/react-ui-canvas/scene` still resolves to the same exports), and `@dxos/react-ui-canvas-compute`'s shapes are scene-engine node types: each shape module exports a `NodeDef` (`gptNodeDef`, `triggerNodeDef`, …, built with `defineComputeNode`) whose component takes `ComputeNodeViewProps`, with ports from `createPorts` / `createFunctionPorts`, and `computeNodeDefs` / `computeNodeRegistry` are the palette. `@dxos/react-ui-canvas-compute` now owns the `CanvasBoard` ECHO type (with `CanvasGraphModel`, the shape schemas and `GraphMonitor`), exported from its root and a new `./types` entry point under the unchanged typename `org.dxos.type.canvasBoard` and version `0.1.0`, so saved boards load as before. Breaking: `@dxos/react-ui-canvas-editor` is removed; `@dxos/react-ui-canvas` no longer exports the pre-engine canvas (`Canvas`, `useCanvasContext`, `Grid`, `FPS`, `ProjectionMapper`, `zoomTo`, `useDrag`, `useWheel`, `Markers`, `getRelativePoint` and the `Point` / `Dimension` / `Rect` schemas) nor its `./types` entry point; and compute's editor-based `ShapeDef` exports (`gptShape`, …), `computeShapes`, `ComputeShapeLayout`, `useComputeGraphController`, `createFunctionAnchors` and `ComputeContext.registry` are removed.
- 3c4d73d: Nodes and links share one `style`: a link's `LineStyle` (colour and `lineStyle`) is the common base a node's `NodeStyle` extends with fill, tone, frame, font size and text alignment (`alignHorizontal`, `alignVertical`); `styleFields` lets a shape extend it further. The properties panel edits the fields a mixed selection shares with one style picker. Drawings gain style classes (`StyleClass`, `SceneStore.styles`, kept in a new optional `Canvas.styles` map beside `content`): an element naming a class derives its style from it, and editing a classed element's look edits the class. Shapes and links of an unregistered type render as the core base (`BaseNode`): a box showing its `label`, or a straight line. A scene shape can open any scene of its drawing, and "New scene from selection" (`groupIntoScene`) moves the selected nodes into a new scene behind one scene shape. Breaking: a link's `line` (`{ hue, dash }`, `LinkLine`) is now `style` (`{ hue, lineStyle }`), which plugin-canvas reads from drawings saved the old way; a node style's `className` is removed; the UML class shape keeps its name in `label` instead of `name`.

### Patch Changes

- b06ee26: The constrained projection keeps a node's style: a hue or tone set from the properties panel on a constrained scene is stored in the model and survives later edits, where before it was dropped as solved geometry.
- Updated dependencies [b0e4b60]
- Updated dependencies [fd09131]
- Updated dependencies [508be04]
- Updated dependencies [347546a]
- Updated dependencies [1eed6b1]
- Updated dependencies [6847fe2]
- Updated dependencies [1819960]
- Updated dependencies [eb5d14d]
- Updated dependencies [4820c02]
- Updated dependencies [b07f49f]
  - @dxos/diagram@0.14.0
  - @dxos/react-ui-form@0.14.0
  - @dxos/react-ui@0.14.0
  - @dxos/react-ui-list@0.14.0
  - @dxos/echo@0.14.0
  - @dxos/effect@0.14.0
  - @dxos/ui-theme@0.14.0
  - @dxos/react-ui-editor@0.14.0
  - @dxos/ui-editor@0.14.0
  - @dxos/react-hooks@0.14.0
  - @dxos/ui-types@0.14.0

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
