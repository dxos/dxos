# @dxos/react-ui-form

## 0.17.0

### Minor Changes

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

- 416201f: An array field shows its field override's `placeholder` in place of its rows while it is empty. A project's overview uses it to say when it has no specs, says the same for empty Notes and Artifacts, and adds artifacts from the Artifacts heading instead of the toolbar.
- 80818bc: A project's repositories are one ordered list, the `Repo.RepositoriesAnnotation` on the project, read with `Repo.getRepositories` and written with `Repo.setRepositories`. The first repository is the one bare issue numbers resolve against and the one a cloud coding agent starts in. plugin-code edits the list in the overview's Software group, above plugin-claude's code folder. A cloud session checks out the project's repositories in their order, then the repositories bound to the chat, each once. Agents edit the list with plugin-code's `CodeOperation.UpdateProjectRepositories` (tool `code-update-project-repositories`), the one tool of its new Project Repositories skill (`org.dxos.skill.code.repositories`).

  The project overview puts the most-used parts first. The name and description are edited in place, with the status as a pill in the top right corner, and both line up with the section headings. `Project`'s status carries an option table (title, hue and icon), so the pill reads Active, Paused, Blocked or Ended in its colour. Then come Notes, Artifacts (six at most until Show all), Milestones (each with its tasks' progress, and a button that opens the Tasks tab filtered to that milestone) and Specs, then a Config section of folded groups, each with a summary of what it holds. The project's own Agent group holds the instructions, skills and context. Other plugins declare groups with `ProjectCapabilities.ConfigGroup`: each field is a schema plus a function from the project to a writable atom, and the overview's form renders and writes it with no UI of the plugin's own. plugin-code declares Software with the project's repositories, and plugin-claude adds the project's code folder on this device, which the desktop app can still choose with its folder picker. A config field's `order` sorts the fields of a group several plugins fill.

  plugin-tasks' task list has a milestone filter beside its sort and grouping, kept per device with the rest of the list's view state. It keeps the tasks under the milestone, sub-tasks that inherit it included, with the ancestors of each.

  react-ui-form's `FormPresentation` gains `title` and `plain`, which render a text field alone as a page's title or as body text, and `section`, which renders an array as a section of its own, its add button on the heading's row. A field override takes a `presentation` of its own in place of the form's `layout`. react-ui's Input has `title` and `plain` variants for it, and Textarea a `plain` one: no well and no inset, and a plain Textarea is as tall as its text. A form's sections leave a wider gap between each other than between their rows, and a form's array rows start on the form's edge. An array field whose label is hidden keeps the label as its list's accessible name, and a text field drawn with no label takes it as its control's. A field override also takes an `action` (`FormFieldAction`): a button at the end of a text control that sets the field's value from what its function returns.

  Breaking:

  - `Project` 0.8.0 drops `repo`, `repositories` and `session`. plugin-projects' migration moves `repo` and then `repositories` into the annotation, each repository once, and drops `session`. Migrated projects cannot be read by an older build.
  - Delegating a task no longer seeds the chat's session config from its project, since `Project.session` is gone.
  - `Project`'s schema no longer has a Repositories field. The overview shows the list, in its Software group, only while plugin-code is enabled, which enabling plugin-claude also does.
  - A generic object update no longer reaches a project's repositories. The GitHub skill points an agent at the Project Repositories skill instead.
  - `ProjectSurface.Settings` is gone. Declare a `ProjectCapabilities.ConfigGroup` instead.

- 8554a26: A project's editors show the other peers' carets: the project's name and description, a spec's text and its embedded feature sections, the overview's Notes and the agent's instructions. Breaking: `@dxos/react-ui-form` removes `CollaborativeTextEditor` (now `InputEditor`, which takes `extensions` or a `value` and `onChange`), `useCollaborativeText`, `Form.Root`'s `object` and `CollaborativeAnnotation`, so a host binds a collaborative field by setting `fieldOverrides.collaborative` and passing `createDataExtensions` through the form's `extensions`; `@dxos/ui-types` removes `CollaborativeAnnotationId`.
- 8a66e4e: You can comment on the text of a Composer spec's features (name, description, each requirement) and on a project's name, description and notes, as well as on the whole object. A comment anchors to a span of one string field, written as an Automerge ref path such as `requirements/<key>/text/[a-b]` by the new `PathAnchor` helpers in `@dxos/types`. A plugin declares which objects a comments companion covers with `AppCapabilities.CommentScope`. `Form.Root` takes `object`, a live ECHO object: a field carrying the `CollaborativeAnnotation` (or `fieldOverrides.collaborative`) edits that object's string in place through Automerge, while other fields report through `onValuesChanged`. `Form.Root`'s `markdownExtensions` is now `extensions`, which also takes a function of the field's path, and a `MarkdownCapabilities.ExtensionProvider` receives the field as `binding`, which is how comment marks reach form fields. `Feature` 0.5.0 stores requirements by key, and the `featureRequirements` migration upgrades 0.4.0 features.
- 10b3963: The chat prompt's task list adds a task in one line again: `TaskList.Editor`'s `inline` lays the create row on the list's own columns, each field the rows' own glyph under the column it edits. An empty estimate shows a ruler rather than the asterisk an empty priority shows. `TaskList.Root` takes the title line's cells as an ordered `columns` list (default `DEFAULT_COLUMNS`), which the rows and an inline create row share; the chat puts status ahead of the title and priority and estimate after it. The project list's create row keeps its stacked layout. Form fields with the `tag` presentation, and the project overview's status, render as react-ui's `Tag` in its new `outline` variant, which draws the hue as a ring and text on no fill.

  Breaking: `TaskList.Root`'s `showAssignees` is removed (leave `assignee` out of `columns`), `Button`'s `pill` is removed, `Select.Trigger`'s `pill` becomes `tag`, which renders the trigger as a `Tag`, and the `pill` form presentation becomes `tag`.

### Patch Changes

- b97d8ea: A feature embedded in a spec is a compact section: a header row of fold toggle, block id, name and status, then its description, requirements and a "Needs" picker. Empty rows and the add and remove actions show only while the section has attention. Folded, a section shows only its header row, with the block ids of the features it needs and its requirement count; which sections are folded is kept on the device. `MarkdownField` draws the `title` and `plain` presentations in place, with no well and one line that grows with its text, as `TextField` does.
- 13bc40d: Feature maps are editable in Composer: create a feature on the map and name it in place, add an existing one from the toolbar, edit a card's name and description inline, set status or remove a feature from its card menu, draw and delete dependency arrows and remove boxes on the canvas, and add dependencies and link tasks from the feature article. Every edit runs the same operation an agent uses, and a refused edit (a dependency that would close a cycle) shows its message as a toast. The canvas dynamic projection accepts `onLink` and `onDelete` hooks, so a host can apply those edits to its own model instead of the projection's graph. `ObjectPicker` no longer pins its popup to a custom trigger's width, so a picker behind an icon button is readable.
- Updated dependencies [90a7f6e]
- Updated dependencies [c1f845f]
- Updated dependencies [cb058b9]
- Updated dependencies [73ed632]
- Updated dependencies [df16fba]
- Updated dependencies [d8b13ad]
- Updated dependencies [1924a44]
- Updated dependencies [b0113a1]
- Updated dependencies [e343467]
- Updated dependencies [9a3313a]
- Updated dependencies [034e231]
- Updated dependencies [0590c11]
- Updated dependencies [9fe0e5c]
- Updated dependencies [aec19dd]
- Updated dependencies [a70fb5a]
- Updated dependencies [f7e965a]
- Updated dependencies [2f78880]
- Updated dependencies [9bcc167]
- Updated dependencies [b3a41d3]
- Updated dependencies [908c301]
- Updated dependencies [f37ae92]
- Updated dependencies [3aef671]
- Updated dependencies [7751052]
- Updated dependencies [545ee73]
- Updated dependencies [9d66bcd]
- Updated dependencies [074e3e6]
- Updated dependencies [17a9e75]
- Updated dependencies [b46d89b]
- Updated dependencies [853663c]
- Updated dependencies [1f73ed2]
- Updated dependencies [691fe84]
- Updated dependencies [09d8716]
- Updated dependencies [0166448]
- Updated dependencies [392bed0]
- Updated dependencies [f86f10e]
- Updated dependencies [c9c3867]
- Updated dependencies [80818bc]
- Updated dependencies [b8cc7e7]
- Updated dependencies [e99e717]
- Updated dependencies [bc5cea7]
- Updated dependencies [aa1cde1]
- Updated dependencies [4fe25ee]
- Updated dependencies [2cebedc]
- Updated dependencies [7da5d17]
- Updated dependencies [4be51c3]
- Updated dependencies [f299590]
- Updated dependencies [ca2a4a8]
- Updated dependencies [bf1dc0c]
- Updated dependencies [7e07e49]
- Updated dependencies [b159f41]
- Updated dependencies [bdb73fb]
- Updated dependencies [39f6b21]
- Updated dependencies [a8e68c5]
- Updated dependencies [8a66e4e]
- Updated dependencies [d00cc85]
- Updated dependencies [768db81]
- Updated dependencies [10b3963]
- Updated dependencies [1a0fff1]
- Updated dependencies [901c1e4]
- Updated dependencies [c1c6cf4]
- Updated dependencies [6f27147]
- Updated dependencies [e67aa80]
- Updated dependencies [e50d1e5]
- Updated dependencies [df65316]
  - @dxos/echo@0.17.0
  - @dxos/react-ui@0.17.0
  - @dxos/ui-types@0.17.0
  - @dxos/ui-editor@0.17.0
  - @dxos/react-ui-editor@0.17.0
  - @dxos/keys@0.17.0
  - @dxos/react-ui-list@0.17.0
  - @dxos/util@0.17.0
  - @dxos/async@0.17.0
  - @dxos/react-ui-query@0.17.0
  - @dxos/echo-doc@0.17.0
  - @dxos/echo-react@0.17.0
  - @dxos/schema@0.17.0
  - @dxos/lit-ui@0.17.0
  - @dxos/ui@0.17.0
  - @dxos/ui-theme@0.17.0
  - @dxos/effect@0.17.0
  - @dxos/log@0.17.0
  - @dxos/react-hooks@0.17.0
  - @dxos/invariant@0.17.0

## 0.16.0

### Patch Changes

- Updated dependencies [dc7785a]
- Updated dependencies [2f76f26]
  - @dxos/react-ui@0.16.0
  - @dxos/echo@0.16.0
  - @dxos/react-ui-editor@0.16.0
  - @dxos/react-ui-list@0.16.0
  - @dxos/react-ui-query@0.16.0
  - @dxos/echo-doc@0.16.0
  - @dxos/echo-react@0.16.0
  - @dxos/schema@0.16.0
  - @dxos/ui-editor@0.16.0
  - @dxos/async@0.16.0
  - @dxos/effect@0.16.0
  - @dxos/invariant@0.16.0
  - @dxos/keys@0.16.0
  - @dxos/log@0.16.0
  - @dxos/util@0.16.0
  - @dxos/lit-ui@0.16.0
  - @dxos/react-hooks@0.16.0
  - @dxos/ui@0.16.0
  - @dxos/ui-theme@0.16.0
  - @dxos/ui-types@0.16.0

## 0.15.0

### Patch Changes

- Updated dependencies [3b03db7]
- Updated dependencies [3d151fc]
- Updated dependencies [ab27b41]
- Updated dependencies [9b2a2c0]
- Updated dependencies [419bf9a]
- Updated dependencies [3aed53a]
- Updated dependencies [ed8df23]
- Updated dependencies [0f6457d]
- Updated dependencies [94d4f85]
- Updated dependencies [b6ae19d]
- Updated dependencies [0d81167]
- Updated dependencies [71fc002]
- Updated dependencies [1e9c017]
- Updated dependencies [1b33a84]
- Updated dependencies [16bde33]
- Updated dependencies [1bc475e]
- Updated dependencies [55bdf55]
- Updated dependencies [9b9a4ca]
- Updated dependencies [098a536]
- Updated dependencies [25af912]
- Updated dependencies [7b47951]
- Updated dependencies [8190cc5]
- Updated dependencies [60ef4ec]
- Updated dependencies [2b6a93a]
  - @dxos/ui-editor@0.15.0
  - @dxos/react-ui@0.15.0
  - @dxos/echo@0.15.0
  - @dxos/async@0.15.0
  - @dxos/react-ui-editor@0.15.0
  - @dxos/echo-react@0.15.0
  - @dxos/react-ui-query@0.15.0
  - @dxos/react-ui-list@0.15.0
  - @dxos/echo-doc@0.15.0
  - @dxos/schema@0.15.0
  - @dxos/effect@0.15.0
  - @dxos/react-hooks@0.15.0
  - @dxos/util@0.15.0
  - @dxos/lit-ui@0.15.0
  - @dxos/invariant@0.15.0
  - @dxos/keys@0.15.0
  - @dxos/log@0.15.0
  - @dxos/ui@0.15.0
  - @dxos/ui-theme@0.15.0
  - @dxos/ui-types@0.15.0

## 0.14.0

### Patch Changes

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

- 4820c02: Stop writing form field values to the debug log, so secrets typed into forms (passwords, API keys, access tokens) no longer reach `app.log` or exported log bundles.
- Updated dependencies [fd09131]
- Updated dependencies [508be04]
- Updated dependencies [347546a]
- Updated dependencies [1eed6b1]
- Updated dependencies [6847fe2]
- Updated dependencies [1819960]
- Updated dependencies [eb5d14d]
- Updated dependencies [b07f49f]
  - @dxos/react-ui@0.14.0
  - @dxos/react-ui-list@0.14.0
  - @dxos/echo@0.14.0
  - @dxos/effect@0.14.0
  - @dxos/ui-theme@0.14.0
  - @dxos/react-ui-editor@0.14.0
  - @dxos/react-ui-query@0.14.0
  - @dxos/echo-doc@0.14.0
  - @dxos/echo-react@0.14.0
  - @dxos/schema@0.14.0
  - @dxos/ui-editor@0.14.0
  - @dxos/ui@0.14.0
  - @dxos/async@0.14.0
  - @dxos/invariant@0.14.0
  - @dxos/keys@0.14.0
  - @dxos/log@0.14.0
  - @dxos/util@0.14.0
  - @dxos/lit-ui@0.14.0
  - @dxos/react-hooks@0.14.0
  - @dxos/ui-types@0.14.0

## 0.13.0

### Minor Changes

- 44b7b80: Add numeric `min`, `max` and `step` to `FormFieldOverride`, so a form can offer a narrower range than its schema enforces. Canvas nodes gain a ports-per-side property; new rectangles, ellipses and classes share one 256x256 default size (nested scenes 512x256) in scene units, no longer scaled by the zoom; a palette drag centres the shape on the pointer and previews it in place of the browser's drag image; ⌘-drag copies the selection; a new link is selected; a link dropped on empty canvas creates a copy of its source shape; a selected node hides its ports; font sizes and port counts outside the editor's range no longer drop a stored node from its scene; and the multi-select panel no longer shares fields whose constraints differ.
- ec9f207: Add `fieldOverrides` to `Form.Root` for per-field label, description, placeholder, readonly, hidden and indeterminate (multi-object "Mixed") values, a `fixed` grid in form layouts, and an indeterminate `Switch`; Enter in a text field commits it as leaving it does. The canvas properties panel floats over the scene, edits several selected elements at once, and uses the standard number fields for geometry and font size; canvas shortcuts fire only while the canvas has focus.

### Patch Changes

- eb14798: `Form.Content` now submits on Ctrl+Enter as well as Cmd+Enter, including from a markdown field, and
  only when the form is valid, so the create-task dialog creates a task from the keyboard and does
  nothing while the title is blank. The dialog's description is now a multi-line markdown field.
- Updated dependencies [d2a6aad]
- Updated dependencies [162fd6d]
- Updated dependencies [aad3e41]
- Updated dependencies [bb2b672]
- Updated dependencies [cb1e218]
- Updated dependencies [1ef899b]
- Updated dependencies [32f32a0]
- Updated dependencies [469e7f7]
- Updated dependencies [665261a]
- Updated dependencies [2e96a73]
- Updated dependencies [ab1bddf]
- Updated dependencies [945092e]
- Updated dependencies [c531b05]
- Updated dependencies [3672aff]
- Updated dependencies [2f95d25]
- Updated dependencies [c7cc480]
- Updated dependencies [7d222fc]
- Updated dependencies [e99ee70]
- Updated dependencies [161f994]
- Updated dependencies [7a177b9]
- Updated dependencies [1894fc1]
- Updated dependencies [246ee3c]
- Updated dependencies [8ebe8d6]
- Updated dependencies [7715216]
- Updated dependencies [1b37aa8]
- Updated dependencies [1737cad]
- Updated dependencies [321c99f]
- Updated dependencies [3d05b7f]
- Updated dependencies [6a7bed4]
- Updated dependencies [3022878]
- Updated dependencies [c2a300a]
- Updated dependencies [17008f0]
- Updated dependencies [4f8e566]
- Updated dependencies [a449958]
- Updated dependencies [49731e1]
  - @dxos/react-ui@0.13.0
  - @dxos/echo@0.13.0
  - @dxos/util@0.13.0
  - @dxos/ui-editor@0.13.0
  - @dxos/react-ui-editor@0.13.0
  - @dxos/react-ui-list@0.13.0
  - @dxos/react-ui-query@0.13.0
  - @dxos/echo-doc@0.13.0
  - @dxos/echo-react@0.13.0
  - @dxos/schema@0.13.0
  - @dxos/async@0.13.0
  - @dxos/effect@0.13.0
  - @dxos/log@0.13.0
  - @dxos/react-hooks@0.13.0
  - @dxos/lit-ui@0.13.0
  - @dxos/invariant@0.13.0
  - @dxos/keys@0.13.0
  - @dxos/ui@0.13.0
  - @dxos/ui-theme@0.13.0
  - @dxos/ui-types@0.13.0

## 0.12.0

### Minor Changes

- a09e18e: `CreateObjectResult.object` is now optional, and so is the value a `CreateEntryOverride.createObject` resolves to. Some creates legitimately finish without an object: the connector create hands off to an OAuth popup or a credential dialog, and the `Connection` appears later, out of band.

  The contract previously demanded an object, so `plugin-connector` satisfied it with `undefined as unknown as Obj.Unknown` — and every caller that trusted the type then crashed on it. Creating a Connection threw `Invalid argument 'object': expected object` from `Obj.getURI` as the create-object dialog tried to navigate to the thing that did not exist yet. The three call sites that dereferenced the result (`ObjectFormDialog`, the database app-graph-builder extension, and `DefaultProperties`) now check before navigating; `RefField` already did.

  Implementors returning a real object are unaffected. Callers reading `result.object` must now handle `undefined`.

- 9d0132f: `Form.Actions` takes `submitDisabled`, which disables submit on top of the form's own `canSave` for work the form did not start itself; the connection panel uses it to hold Connect while its first OAuth start is in flight. A task row's description now spans the artifacts column, so it flows under a pull request chip rather than stopping short of it.
- f2d8a92: The form ontology: three parts that map one for one onto `@dxos/react-ui`'s `Field` and `Fieldset`, with binding, semantics and layout kept apart.

  - **Breaking:** `Form.Field` is one `Field.Root` row whether bound or not. With `path` it is bound: label, description, value and error come from the schema and the model, and with no children the dispatcher picks the control; a hand-written control inside reads the binding with `useFormField()`. Without `path` it takes `label`, `description` and `error` (a string; was `validation`, a node) as props and its children are the control, which the row's label now names. `standalone` says the row holds no single control (a button, a readout). The render-prop form of `children` is gone.
  - **Breaking:** `Form.FieldSet` is the one grouping element: a `<fieldset>` with `label`, `description` and `collapsible`, chrome by depth (a top-level field set is a titled section, a nested one an indented group). It walks nothing. `Form.Section` (`title` → `label`) and `Form.Group` are removed.
  - **New:** `Form.Fields` walks the schema at a `path` with `include`, `exclude`, `sort` and `filter`, rendering a `Form.Field` per property and a `Form.FieldSet` around a nested object. What `<Form.FieldSet />` used to do is now `<Form.FieldSet label><Form.Fields /></Form.FieldSet>`.
  - **Breaking:** the built-in renderers (`TextField`, `SelectField`, …) are controls with no row of their own; a `fieldMap` or `fieldProvider` renderer owns its row and writes `<Form.Field path={jsonPath}>` around its control. `Form.Error` is `Form.ErrorText`. `FormFieldHeader` no longer takes `path`.
  - `MarkdownView` spreads its remaining props and accepts `className`, so a parent can render it `asChild`.
  - A row can lay its label beside the control (`labelPlacement='beside'`); a boolean does so by default, so a toggle reads with its text on one line in the default variant, while the settings card keeps its label column.

  In `@dxos/react-ui`, alongside:

  `Menu.Item`, `Menu.CheckboxItem` and `Menu.RadioItem` honour `closeOnSelect={false}`: a toggle keeps the menu open, as `onSelect` with `preventDefault()` already did. The Menu story renders every part (submenu, checkbox items, radio group, context trigger) and asserts them.

  `Field.Switch` and `Field.Checkbox` pad themselves to the density's control height through their block margins, so a toggle takes a full row and sits centred in it, bare or beside its label; `Field.Block` sizes by the same token. Their focus ring is inset, so a focused toggle stays inside its row.

### Patch Changes

- 5dc2419: The create-object dialog now has Cancel and Create buttons, and pressing Enter in a single-line field
  creates the object (Escape still cancels). `@dxos/react-ui-form` exports `useSubmitOnEnter`, which gives any
  form a native form's implicit Enter submission without touching multi-line fields.
- bd792a6: `Form.FieldSet` renders its actions in the legend row rather than positioning them against the field set, so a settings panel's scope controls no longer sit on top of its first field in WebKit.
- 8608f03: A root `Form.FieldSet` carries its top spacing on the legend, so section headings keep their spacing in WebKit, which lays a rendered legend at the field set's border edge.
- 77a2d34: Replace `SpaceOperation.OpenCreateObject` with `SpaceOperation.OpenObjectForm`, which returns a reference to the object the user confirmed (or nothing if the dialog was dismissed) instead of taking an `onCreateObject` callback. It also accepts a `schema` for callers with an ad-hoc form schema, and a `mode: 'live'` that adds the object to the database before the form opens — so fields resolving against the database behave as they do after creation — and removes it again on dismissal. This is a breaking rename: replace `OpenCreateObject` with `OpenObjectForm` and `initialFormValues` with `defaults`. A form whose root is a discriminated union now opens on the union's first member, and the required-field asterisk clears once a field holds a value.
- 58b59d7: `Form.FieldSet` actions sit at the end of the heading row instead of overlapping the first field, and the Assistant, Debug, Script and Spaces settings panels now show the synced/local scope toggle.
- Updated dependencies [a92ea18]
- Updated dependencies [0c6c186]
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
- Updated dependencies [b47fd84]
- Updated dependencies [3c7b013]
- Updated dependencies [fd873d2]
- Updated dependencies [b1dc20c]
- Updated dependencies [ac71815]
- Updated dependencies [7c87626]
- Updated dependencies [c020513]
- Updated dependencies [f82c78f]
- Updated dependencies [9714c75]
- Updated dependencies [63fc847]
- Updated dependencies [2d58ea5]
- Updated dependencies [bd6ba8e]
- Updated dependencies [0fe00c5]
- Updated dependencies [75971ad]
- Updated dependencies [3958355]
- Updated dependencies [fd23a8b]
- Updated dependencies [5262408]
- Updated dependencies [d194929]
- Updated dependencies [6ef35a6]
- Updated dependencies [d17d75a]
- Updated dependencies [557e243]
- Updated dependencies [864cd0d]
- Updated dependencies [ea11703]
- Updated dependencies [cff33b7]
- Updated dependencies [b2caee6]
- Updated dependencies [9baf25f]
- Updated dependencies [34f7d92]
- Updated dependencies [dcf911b]
- Updated dependencies [b63506b]
- Updated dependencies [6af89f4]
- Updated dependencies [d770fe7]
- Updated dependencies [da37a13]
- Updated dependencies [0a01ff7]
- Updated dependencies [1c995c4]
- Updated dependencies [6f4a887]
- Updated dependencies [ab56cfe]
- Updated dependencies [1aabb03]
- Updated dependencies [7ec1738]
- Updated dependencies [df295b2]
- Updated dependencies [d0beedc]
- Updated dependencies [731b264]
- Updated dependencies [a69d861]
- Updated dependencies [4dccfd3]
- Updated dependencies [ba08e65]
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
- Updated dependencies [4800a6f]
- Updated dependencies [1b62726]
- Updated dependencies [a3b6ef0]
- Updated dependencies [4c55b5d]
- Updated dependencies [b02fe16]
- Updated dependencies [472ca95]
- Updated dependencies [5b99c47]
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
- Updated dependencies [098a0bb]
- Updated dependencies [72f7584]
- Updated dependencies [e94ed89]
- Updated dependencies [882ac2a]
- Updated dependencies [0132aab]
- Updated dependencies [47c8d7e]
- Updated dependencies [10b1239]
- Updated dependencies [851791f]
- Updated dependencies [b600f72]
- Updated dependencies [99e323d]
- Updated dependencies [ea11703]
- Updated dependencies [bcfe4c5]
- Updated dependencies [ce194c0]
- Updated dependencies [41e2750]
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
- Updated dependencies [08cddf6]
- Updated dependencies [c0e5651]
- Updated dependencies [efdcf61]
- Updated dependencies [a04ab6e]
- Updated dependencies [a283607]
- Updated dependencies [24fcadc]
- Updated dependencies [b00ee72]
- Updated dependencies [4804da0]
- Updated dependencies [d4b4919]
- Updated dependencies [63e500b]
- Updated dependencies [ec4f4ca]
- Updated dependencies [5662dfc]
- Updated dependencies [d1a69fb]
- Updated dependencies [b1bb838]
- Updated dependencies [19f19a2]
- Updated dependencies [2a41efd]
- Updated dependencies [142ba02]
- Updated dependencies [e1ee9dd]
- Updated dependencies [f3c02b3]
- Updated dependencies [0a3e9dd]
- Updated dependencies [e2b04f6]
- Updated dependencies [256f286]
- Updated dependencies [306f50d]
- Updated dependencies [61becad]
- Updated dependencies [6c881a2]
- Updated dependencies [690dcaa]
- Updated dependencies [b7822a7]
- Updated dependencies [cc9b81f]
- Updated dependencies [c8b65f3]
- Updated dependencies [9feee5e]
- Updated dependencies [f2d8a92]
- Updated dependencies [d005fd9]
- Updated dependencies [0e44f24]
- Updated dependencies [cef0a3b]
- Updated dependencies [bd06669]
- Updated dependencies [5b504b4]
- Updated dependencies [eb95cd7]
- Updated dependencies [d7b0a3b]
- Updated dependencies [1482a3f]
- Updated dependencies [2513a52]
- Updated dependencies [17ed864]
- Updated dependencies [1d6f730]
- Updated dependencies [b125655]
- Updated dependencies [f4c2702]
- Updated dependencies [7407d65]
- Updated dependencies [318bbad]
- Updated dependencies [fc83abd]
- Updated dependencies [9a3f01e]
- Updated dependencies [178bc6d]
- Updated dependencies [8904184]
- Updated dependencies [e680b16]
- Updated dependencies [a805212]
- Updated dependencies [6fed038]
- Updated dependencies [ea11703]
- Updated dependencies [fa82aef]
- Updated dependencies [178a283]
- Updated dependencies [18597fc]
- Updated dependencies [9205bd3]
- Updated dependencies [fce2060]
- Updated dependencies [bda45ac]
- Updated dependencies [5885380]
- Updated dependencies [881f900]
- Updated dependencies [6a1ec57]
- Updated dependencies [82a9c4e]
- Updated dependencies [1957b39]
- Updated dependencies [e3d7a8c]
- Updated dependencies [0c92b44]
- Updated dependencies [72b2984]
- Updated dependencies [5dedae9]
- Updated dependencies [693d1b4]
- Updated dependencies [32584c9]
- Updated dependencies [a3c10f1]
- Updated dependencies [32353e6]
- Updated dependencies [559acfa]
- Updated dependencies [631df48]
- Updated dependencies [e8088ea]
- Updated dependencies [928e0b2]
- Updated dependencies [1a3de22]
- Updated dependencies [5d816a6]
- Updated dependencies [4c5b2c7]
- Updated dependencies [f9816c0]
- Updated dependencies [6fd2a5d]
- Updated dependencies [525aee0]
- Updated dependencies [06cbe76]
- Updated dependencies [40b50c2]
- Updated dependencies [f112c37]
- Updated dependencies [8048e42]
- Updated dependencies [520c34f]
- Updated dependencies [4ae2005]
- Updated dependencies [605455c]
- Updated dependencies [ff93962]
- Updated dependencies [9d8fcbd]
- Updated dependencies [85bdad2]
- Updated dependencies [b2a44d6]
- Updated dependencies [77d0026]
- Updated dependencies [4a10672]
- Updated dependencies [c209b42]
- Updated dependencies [78433b0]
- Updated dependencies [77976e4]
- Updated dependencies [e0a9adb]
- Updated dependencies [f99a6e9]
- Updated dependencies [eda8b55]
- Updated dependencies [cc11297]
- Updated dependencies [ff37699]
- Updated dependencies [6dadb41]
  - @dxos/echo@0.12.0
  - @dxos/ui-theme@0.12.0
  - @dxos/schema@0.12.0
  - @dxos/react-ui@0.12.0
  - @dxos/react-ui-components@0.12.0
  - @dxos/effect@0.12.0
  - @dxos/react-ui-list@0.12.0
  - @dxos/ui-editor@0.12.0
  - @dxos/lit-ui@0.12.0
  - @dxos/react-ui-editor@0.12.0
  - @dxos/util@0.12.0
  - @dxos/async@0.12.0
  - @dxos/log@0.12.0
  - @dxos/ui-types@0.12.0
  - @dxos/react-ui-markdown@0.12.0
  - @dxos/react-ui-search@0.12.0
  - @dxos/react-hooks@0.12.0
  - @dxos/echo-doc@0.12.0
  - @dxos/echo-react@0.12.0
  - @dxos/react-ui-pickers@0.12.0
  - @dxos/ui@0.12.0
  - @dxos/keys@0.12.0
  - @dxos/invariant@0.12.0

## 0.11.1

### Patch Changes

- @dxos/async@0.11.1
- @dxos/echo@0.11.1
- @dxos/echo-doc@0.11.1
- @dxos/echo-protocol@0.11.1
- @dxos/echo-react@0.11.1
- @dxos/effect@0.11.1
- @dxos/invariant@0.11.1
- @dxos/keys@0.11.1
- @dxos/lit-ui@0.11.1
- @dxos/log@0.11.1
- @dxos/react-client@0.11.1
- @dxos/react-ui-components@0.11.1
- @dxos/react-ui-editor@0.11.1
- @dxos/react-ui-list@0.11.1
- @dxos/react-ui-markdown@0.11.1
- @dxos/react-ui-pickers@0.11.1
- @dxos/react-ui-search@0.11.1
- @dxos/schema@0.11.1
- @dxos/types@0.11.1
- @dxos/ui@0.11.1
- @dxos/ui-editor@0.11.1
- @dxos/util@0.11.1

## 0.11.0

### Minor Changes

- 848ba1b: Add a `Slider` primitive built on the Radix slider (`Slider.Root`/`Track`/`Range`/`Thumb` composed behind a single themed component), supporting one or more thumbs, horizontal and vertical orientation, and a disabled state. `react-ui-form`'s `Form.Row` gains an additive `labelEnd` slot that renders trailing content at the end of the label row, so a field can show a live value beside its label without nesting it inside `Input.Label` (which would change the input's accessible name).

### Patch Changes

- 717edc0: Add a `hideEmpty` option to `Form` (default `true`) controlling whether empty-valued fields are omitted when read-only; set `hideEmpty={false}` to keep the full set of schema fields visible as static rows. Also disable the underlying `Select.Root` in `SelectField` when read-only so the popover no longer opens.
- Updated dependencies [f9ba47a]
- Updated dependencies [4e64123]
- Updated dependencies [c035062]
- Updated dependencies [aea1e6e]
- Updated dependencies [9da013f]
- Updated dependencies [e0e1a9f]
- Updated dependencies [46ec569]
- Updated dependencies [53fde97]
- Updated dependencies [b5ecf54]
- Updated dependencies [3f6ac61]
- Updated dependencies [091ebe4]
- Updated dependencies [a256a87]
- Updated dependencies [bce1dbc]
- Updated dependencies [a31ef40]
- Updated dependencies [ed992c2]
- Updated dependencies [e510f3b]
- Updated dependencies [ed992c2]
- Updated dependencies [3f1fc67]
- Updated dependencies [46ec569]
- Updated dependencies [f8637f1]
- Updated dependencies [b8c0825]
- Updated dependencies [4e64123]
- Updated dependencies [717edc0]
- Updated dependencies [2e10525]
- Updated dependencies [6a03a30]
- Updated dependencies [2fe5a7a]
- Updated dependencies [7b270f2]
- Updated dependencies [7b270f2]
- Updated dependencies [af5fbf4]
- Updated dependencies [d547045]
- Updated dependencies [277e365]
- Updated dependencies [ba7aabf]
- Updated dependencies [d958118]
- Updated dependencies [2a68c3b]
- Updated dependencies [6d2afe0]
- Updated dependencies [e65432c]
- Updated dependencies [f6a01e3]
- Updated dependencies [c9651f1]
- Updated dependencies [9cde1c6]
- Updated dependencies [923d5be]
- Updated dependencies [85893fe]
- Updated dependencies [717edc0]
- Updated dependencies [12fd785]
- Updated dependencies [6e4ac74]
- Updated dependencies [51aaffe]
- Updated dependencies [801b77f]
- Updated dependencies [59a65a8]
- Updated dependencies [5f08a6a]
- Updated dependencies [37874ce]
- Updated dependencies [848ba1b]
- Updated dependencies [3761762]
- Updated dependencies [c9da903]
- Updated dependencies [55bb048]
- Updated dependencies [4bb7e3b]
- Updated dependencies [4df6cf3]
- Updated dependencies [77fff35]
- Updated dependencies [6e624bd]
- Updated dependencies [686fac1]
- Updated dependencies [96109be]
- Updated dependencies [37c17cc]
- Updated dependencies [f0ec728]
- Updated dependencies [392c700]
- Updated dependencies [20153c0]
- Updated dependencies [ed992c2]
- Updated dependencies [ed992c2]
- Updated dependencies [c58ebb7]
- Updated dependencies [a49131a]
- Updated dependencies [ac51564]
- Updated dependencies [a1c89fa]
  - @dxos/echo@0.11.0
  - @dxos/async@0.11.0
  - @dxos/schema@0.11.0
  - @dxos/react-ui-list@0.11.0
  - @dxos/react-ui@0.11.0
  - @dxos/react-ui-editor@0.11.0
  - @dxos/ui-editor@0.11.0
  - @dxos/ui@0.11.0
  - @dxos/react-ui-search@0.11.0
  - @dxos/util@0.11.0
  - @dxos/keys@0.11.0
  - @dxos/react-ui-components@0.11.0
  - @dxos/types@0.11.0
  - @dxos/ui-theme@0.11.0
  - @dxos/log@0.11.0
  - @dxos/echo-react@0.11.0
  - @dxos/react-ui-markdown@0.11.0
  - @dxos/react-client@0.11.0
  - @dxos/echo-doc@0.11.0
  - @dxos/react-ui-pickers@0.11.0
  - @dxos/lit-ui@0.11.0
  - @dxos/effect@0.11.0
  - @dxos/echo-protocol@0.11.0
  - @dxos/invariant@0.11.0
