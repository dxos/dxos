# @dxos/plugin-markdown

## 0.17.0

### Minor Changes

- f37ae92: The arrow keys stop on an embedded block instead of skipping it. A selected embed has focus, attention and a focus ring. Enter goes into it, Escape from inside selects it again, and Escape on the selection returns to the line after it, or before it when none follows. From a selected embed, the arrows go on to the text or the next embed, Alt+Up and Alt+Down move it, and Backspace or Delete removes it. An embed renders its content in `Editor.BlockFrame`, which takes the focus, draws the ring and answers these keys through `handleBlockWidgetKey`. plugin-markdown contributes its object links and embeds as `MarkdownCapabilities.ObjectEmbeds`. A spec's editor draws them and takes every `MarkdownCapabilities.ExtensionProvider` through `ProjectHooks.useSpecExtensions`, so an embed is the same in a spec and in a Markdown document, and a spec gets what other plugins add to Markdown, such as diagrams.
- 45e1c93: Every plugin is now defined in its package-root `dx.config.ts` with `Plugin.config`, whose module bodies are marked `import('./x.ts', { with: { type: 'module-url' } })`; an app built with `pluginConfigPlugin` boots from each plugin's metadata and loads its module manifest when the plugin is enabled. Breaking: a plugin's `./<X>Plugin` export now carries `{ meta, make }` (call `XPlugin.make()`), the `#plugin`/`#capabilities` imports, the `dx-plugin` CLI and the generated capability barrels are removed, and module `props` mappers and inline modules are rejected by the build.
- c9c3867: Add `ExportOperation.Print` and `ExportOperation.Save` with a per-type `AppCapabilities.Exporter` capability. Objects whose type contributes an exporter get "Print…" and "Save as file…" on their article menu. Markdown saves `.md`, sheets save `.csv`, tables save `.dx.json`, and 2D canvas drawings save `.svg`. Print opens the browser print dialog, which can save a PDF. `@dxos/util` gains `printHtml`, `htmlTable` and `escapeHtml`.

### Patch Changes

- b6d1c9c: Documents, sheets and presentations an agent creates on EDGE, and drawings it copies with `convert`, are filed into the space's collection again: these operations hand the new object to `SpaceOperation.AddObject`, which plugin-space runs with its filing rule, instead of looking for that rule in a bundle that does not have it. `DefaultParent.resolve` warns when a collection item has no filing rule at all.
- f142d06: The chat prompt is redesigned. One picker chooses the agent, where it runs (this device or EDGE) and the model. Skills load as `/` commands, and `@` mentions an object, which joins the chat's context when the message is sent. A "+" menu adds files, objects, commands and MCP servers; "Add an object…" opens the search dialog as a picker (`SearchOperation.SelectObject`). The chat's tasks and its context are two drawers above the prompt, and other plugins can add sections to the context drawer (`ChatSurface.ChatDetails`).

  The `@` menus in the chat and in the markdown editor now run a full-text search once typing pauses, through `ObjectCombobox.useSearch` in `@dxos/app-toolkit`; the markdown `@` menu now matches body text as well as names. `searchQuery`, `searchFilter`, `byRelevance` and `useListedTypeUris` moved to `ObjectCombobox` from plugin-search, which no longer exports `buildSearchQuery`, `buildSearchFilter` or `useSearchableTypeUris`.

  Replies no longer stop rendering when the thread's view is switched while they stream.

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

- d95ffc3: Plugin operations now work when EDGE runs them from their own plugin bundles. An invocation's writes are saved even when its operation declares no `Database.Service`, so `tasks.move` and the Gmail, Calendar and JMAP materialize operations keep what they create. A bundle's skills keep `agentCanEnable`, so an agent can still enable them. Fixes in individual plugins:

  - `thread.createChannel` saves the channel in the space, and the feed backend loads the channel's feed before appending.
  - Markdown creates documents with an empty history.
  - Magazine's `loadPostContent` loads its post.
  - Loading an object by reference resolves its type from the type sources when the registry lacks it, so an object whose type another plugin publishes arrives with a schema.
  - Unsubscribing from a sender keeps the first skip filter, and plugin-inbox registers the `Tag` type it creates.

  plugin-google and plugin-jmap now ship EDGE bundles.

- 4be51c3: Plugin `workerd` (EDGE) builds no longer bundle editor extensions, CLI commands, local-client layer specs, UI state or defuddle's DOM build: those modules now list `['browser', 'node', 'tauri']`, and markdown's Scroll To Anchor operation registers only in the browser. `@dxos/ui-editor/hunks` exports the word-level diff helpers (`cherryPickHunk`, `revertHunk`, `computeWordHunks`) without a CodeMirror dependency; **Breaking:** `@dxos/ui-editor/headless` no longer exports `cherryPickHunk` and `revertHunk`; import them from `@dxos/ui-editor/hunks` (or the package root) instead.
- 1a0fff1: Keep guided tours working on a narrow plank: a step pointing at a toolbar control now opens the overflow menu when the toolbar has folded that control away, and a step whose target never appears is stepped over rather than ending the tour.
- Updated dependencies [5d280a1]
- Updated dependencies [3f250b7]
- Updated dependencies [fc5e071]
- Updated dependencies [c9a38c1]
- Updated dependencies [b6d1c9c]
- Updated dependencies [90a7f6e]
- Updated dependencies [c1f845f]
- Updated dependencies [9cb96c7]
- Updated dependencies [812ae94]
- Updated dependencies [cb058b9]
- Updated dependencies [73ed632]
- Updated dependencies [710da43]
- Updated dependencies [d338edb]
- Updated dependencies [cab57d0]
- Updated dependencies [df16fba]
- Updated dependencies [e8029c3]
- Updated dependencies [f142d06]
- Updated dependencies [d8b13ad]
- Updated dependencies [1924a44]
- Updated dependencies [1ac444f]
- Updated dependencies [782ee41]
- Updated dependencies [d7dc2fc]
- Updated dependencies [d105c19]
- Updated dependencies [7a8b279]
- Updated dependencies [b97d8ea]
- Updated dependencies [b0113a1]
- Updated dependencies [e343467]
- Updated dependencies [04d5fb1]
- Updated dependencies [9a3313a]
- Updated dependencies [034e231]
- Updated dependencies [0590c11]
- Updated dependencies [9fe0e5c]
- Updated dependencies [d45bf58]
- Updated dependencies [f82b258]
- Updated dependencies [b2d8572]
- Updated dependencies [c80b89d]
- Updated dependencies [6a41aa7]
- Updated dependencies [f3dde57]
- Updated dependencies [68d1c38]
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
- Updated dependencies [f10c1dc]
- Updated dependencies [13bc40d]
- Updated dependencies [59b9d5a]
- Updated dependencies [7751052]
- Updated dependencies [545ee73]
- Updated dependencies [2bba392]
- Updated dependencies [38ebf5e]
- Updated dependencies [9d66bcd]
- Updated dependencies [592fdad]
- Updated dependencies [49df146]
- Updated dependencies [a18cb35]
- Updated dependencies [9471682]
- Updated dependencies [074e3e6]
- Updated dependencies [3eefd80]
- Updated dependencies [0d3e4cf]
- Updated dependencies [1a1012b]
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
- Updated dependencies [8554a26]
- Updated dependencies [80c25fe]
- Updated dependencies [20a14b9]
- Updated dependencies [5970ed3]
- Updated dependencies [b8cc7e7]
- Updated dependencies [e99e717]
- Updated dependencies [bc5cea7]
- Updated dependencies [1a06754]
- Updated dependencies [aa1cde1]
- Updated dependencies [4fe25ee]
- Updated dependencies [f071de2]
- Updated dependencies [f175a2d]
- Updated dependencies [a9793bf]
- Updated dependencies [de25be8]
- Updated dependencies [ed0d367]
- Updated dependencies [2cebedc]
- Updated dependencies [7da5d17]
- Updated dependencies [8d7d5e1]
- Updated dependencies [4be51c3]
- Updated dependencies [f299590]
- Updated dependencies [ca2a4a8]
- Updated dependencies [02254b0]
- Updated dependencies [bf1dc0c]
- Updated dependencies [3d06043]
- Updated dependencies [7e07e49]
- Updated dependencies [b159f41]
- Updated dependencies [97de470]
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
- Updated dependencies [e7ca5d7]
- Updated dependencies [e1d537b]
- Updated dependencies [1a0fff1]
- Updated dependencies [901c1e4]
- Updated dependencies [e67aa80]
- Updated dependencies [e50d1e5]
- Updated dependencies [df65316]
  - @dxos/assistant@0.17.0
  - @dxos/types@0.17.0
  - @dxos/app-toolkit@0.17.0
  - @dxos/echo@0.17.0
  - @dxos/react-ui-attention@0.17.0
  - @dxos/react-ui@0.17.0
  - @dxos/ui-types@0.17.0
  - @dxos/compute@0.17.0
  - @dxos/ui-editor@0.17.0
  - @dxos/app-framework@0.17.0
  - @dxos/client@0.17.0
  - @dxos/react-ui-editor@0.17.0
  - @dxos/plugin-space@0.17.0
  - @dxos/react-ui-form@0.17.0
  - @dxos/plugin-client@0.17.0
  - @dxos/echo-client@0.17.0
  - @dxos/keys@0.17.0
  - @dxos/client-protocol@0.17.0
  - @dxos/halo-react@0.17.0
  - @dxos/util@0.17.0
  - @dxos/react-ui-menu@0.17.0
  - @dxos/async@0.17.0
  - @dxos/plugin-attention@0.17.0
  - @dxos/plugin-graph@0.17.0
  - @dxos/echo-doc@0.17.0
  - @dxos/echo-react@0.17.0
  - @dxos/react-client@0.17.0
  - @dxos/schema@0.17.0
  - @dxos/versioning@0.17.0
  - @dxos/react-ui-components@0.17.0
  - @dxos/react-ui-dnd@0.17.0
  - @dxos/ui@0.17.0
  - @dxos/ui-theme@0.17.0
  - @dxos/halo@0.17.0
  - @dxos/effect@0.17.0
  - @dxos/log@0.17.0
  - @dxos/react-focus@0.17.0
  - @dxos/react-hooks@0.17.0
  - @dxos/invariant@0.17.0

## 0.16.0

### Patch Changes

- Updated dependencies [dc7785a]
- Updated dependencies [2f76f26]
  - @dxos/react-ui@0.16.0
  - @dxos/echo-client@0.16.0
  - @dxos/assistant@0.16.0
  - @dxos/echo@0.16.0
  - @dxos/plugin-space@0.16.0
  - @dxos/client@0.16.0
  - @dxos/react-client@0.16.0
  - @dxos/plugin-attention@0.16.0
  - @dxos/plugin-client@0.16.0
  - @dxos/app-framework@0.16.0
  - @dxos/app-toolkit@0.16.0
  - @dxos/react-ui-attention@0.16.0
  - @dxos/react-ui-components@0.16.0
  - @dxos/react-ui-dnd@0.16.0
  - @dxos/react-ui-editor@0.16.0
  - @dxos/react-ui-form@0.16.0
  - @dxos/react-ui-menu@0.16.0
  - @dxos/compute@0.16.0
  - @dxos/echo-doc@0.16.0
  - @dxos/echo-react@0.16.0
  - @dxos/client-protocol@0.16.0
  - @dxos/schema@0.16.0
  - @dxos/types@0.16.0
  - @dxos/versioning@0.16.0
  - @dxos/ui-editor@0.16.0
  - @dxos/plugin-graph@0.16.0
  - @dxos/halo@0.16.0
  - @dxos/halo-react@0.16.0
  - @dxos/async@0.16.0
  - @dxos/effect@0.16.0
  - @dxos/invariant@0.16.0
  - @dxos/keys@0.16.0
  - @dxos/log@0.16.0
  - @dxos/util@0.16.0
  - @dxos/react-focus@0.16.0
  - @dxos/react-hooks@0.16.0
  - @dxos/ui@0.16.0
  - @dxos/ui-theme@0.16.0
  - @dxos/ui-types@0.16.0

## 0.15.0

### Patch Changes

- 417247b: A Markdown document whose content is slow to load now shows a "Loading…" placeholder, and one whose content is missing from this device or deleted shows a message saying so in place of the editor, instead of an editor that silently ignores clicks.
- 1bc475e: Typing `@` in a document filters the link picker inline again, so focus stays in the editor and arrow keys and Enter pick a row. The query can hold spaces, so a whole phrase can match an object or name a new one; a double space, moving the cursor out of the query, Escape (which keeps the text) or Enter ends it. The picker lists the same objects as `ObjectCombobox`, labelled the same way and with each type's coloured icon; the editor menu gains `multiWordTriggers` and `EditorMenuItem.iconHue` for this. Creating an object from the picker now makes exactly one object, keeps the typed name for a drawing too, and leaves the cursor after the new link: the create dialog ignores a second pick while it closes, and closing any app dialog returns focus to where it was before it opened.
- 098a536: `SampleSpace.phase` is replaced by `SampleSpace.partial`: the content one `CONTENT.md` spec describes, which may compose smaller partials and carries their schemas. `SampleSpace.make` takes `partials` instead of `phases`. The debug plugin adds a Fieldstone Labs space template, a software team run mostly by agents, built from four partials plus the DXOS architecture diagrams; `@dxos/plugin-canvas` now publishes and exports its architecture partial from `@dxos/plugin-canvas/Architecture`. A contact card shows the employer's name instead of only an icon, related events no longer swap recent and upcoming, a conversation's message header keeps its date and actions to the right with the subject at full width, an event's star sits beside its title, cards have a visible edge in light mode, a calendar card lists at most three attendees, a sheet embedded in a document renders instead of failing, and object links past a document's first screen render as links instead of raw markdown.
- Updated dependencies [3b03db7]
- Updated dependencies [6488905]
- Updated dependencies [3d151fc]
- Updated dependencies [ab27b41]
- Updated dependencies [9b2a2c0]
- Updated dependencies [94ec06d]
- Updated dependencies [419bf9a]
- Updated dependencies [3aed53a]
- Updated dependencies [b7d83c9]
- Updated dependencies [ed8df23]
- Updated dependencies [0f6457d]
- Updated dependencies [94d4f85]
- Updated dependencies [b6ae19d]
- Updated dependencies [460bbc3]
- Updated dependencies [b82150a]
- Updated dependencies [0d81167]
- Updated dependencies [71fc002]
- Updated dependencies [1e9c017]
- Updated dependencies [1b33a84]
- Updated dependencies [16bde33]
- Updated dependencies [1bc475e]
- Updated dependencies [d250ed2]
- Updated dependencies [55bdf55]
- Updated dependencies [ed1039a]
- Updated dependencies [9b9a4ca]
- Updated dependencies [b7fe13f]
- Updated dependencies [37edd53]
- Updated dependencies [098a536]
- Updated dependencies [6a02061]
- Updated dependencies [1bddc93]
- Updated dependencies [25af912]
- Updated dependencies [7b47951]
- Updated dependencies [8190cc5]
- Updated dependencies [60ef4ec]
- Updated dependencies [2b6a93a]
- Updated dependencies [743604d]
  - @dxos/ui-editor@0.15.0
  - @dxos/assistant@0.15.0
  - @dxos/plugin-space@0.15.0
  - @dxos/react-ui@0.15.0
  - @dxos/echo@0.15.0
  - @dxos/compute@0.15.0
  - @dxos/echo-client@0.15.0
  - @dxos/app-framework@0.15.0
  - @dxos/plugin-client@0.15.0
  - @dxos/react-ui-components@0.15.0
  - @dxos/async@0.15.0
  - @dxos/react-ui-editor@0.15.0
  - @dxos/app-toolkit@0.15.0
  - @dxos/echo-react@0.15.0
  - @dxos/client@0.15.0
  - @dxos/client-protocol@0.15.0
  - @dxos/plugin-attention@0.15.0
  - @dxos/react-ui-form@0.15.0
  - @dxos/react-client@0.15.0
  - @dxos/react-ui-attention@0.15.0
  - @dxos/react-ui-dnd@0.15.0
  - @dxos/react-ui-menu@0.15.0
  - @dxos/echo-doc@0.15.0
  - @dxos/schema@0.15.0
  - @dxos/types@0.15.0
  - @dxos/versioning@0.15.0
  - @dxos/plugin-graph@0.15.0
  - @dxos/halo@0.15.0
  - @dxos/effect@0.15.0
  - @dxos/react-hooks@0.15.0
  - @dxos/halo-react@0.15.0
  - @dxos/util@0.15.0
  - @dxos/invariant@0.15.0
  - @dxos/keys@0.15.0
  - @dxos/log@0.15.0
  - @dxos/react-focus@0.15.0
  - @dxos/ui@0.15.0
  - @dxos/ui-theme@0.15.0
  - @dxos/ui-types@0.15.0

## 0.14.0

### Patch Changes

- 085dcb1: `@dxos/brand` ships Poiret One (`assets/fonts/poiret-one`), the face of the Composer wordmark. The Markdown, Sheet, Tables and Projects plugins' details now include a narrated demo video, opening on the Composer ident.
- 27b542c: Composer plugins lay out their panels with react-ui's `Layout.Flex` / `Layout.Grid` and theme colour tokens instead of hand-written flex/grid classes and raw palette colours, so status colours now follow the theme in light and dark mode.
- Updated dependencies [f0fc12a]
- Updated dependencies [0715304]
- Updated dependencies [b0e4b60]
- Updated dependencies [fd09131]
- Updated dependencies [508be04]
- Updated dependencies [347546a]
- Updated dependencies [ec6da5a]
- Updated dependencies [a1e64db]
- Updated dependencies [28bb45b]
- Updated dependencies [1eed6b1]
- Updated dependencies [ed52cb7]
- Updated dependencies [6847fe2]
- Updated dependencies [385f3ce]
- Updated dependencies [3e98467]
- Updated dependencies [1819960]
- Updated dependencies [eb5d14d]
- Updated dependencies [2112757]
- Updated dependencies [4820c02]
- Updated dependencies [5324de6]
- Updated dependencies [b07f49f]
  - @dxos/assistant@0.14.0
  - @dxos/app-framework@0.14.0
  - @dxos/react-ui-form@0.14.0
  - @dxos/react-ui@0.14.0
  - @dxos/compute@0.14.0
  - @dxos/echo@0.14.0
  - @dxos/echo-client@0.14.0
  - @dxos/plugin-space@0.14.0
  - @dxos/effect@0.14.0
  - @dxos/ui-theme@0.14.0
  - @dxos/plugin-attention@0.14.0
  - @dxos/plugin-client@0.14.0
  - @dxos/plugin-graph@0.14.0
  - @dxos/app-toolkit@0.14.0
  - @dxos/client@0.14.0
  - @dxos/react-client@0.14.0
  - @dxos/react-ui-attention@0.14.0
  - @dxos/react-ui-components@0.14.0
  - @dxos/react-ui-dnd@0.14.0
  - @dxos/react-ui-editor@0.14.0
  - @dxos/react-ui-menu@0.14.0
  - @dxos/echo-doc@0.14.0
  - @dxos/echo-react@0.14.0
  - @dxos/client-protocol@0.14.0
  - @dxos/schema@0.14.0
  - @dxos/types@0.14.0
  - @dxos/versioning@0.14.0
  - @dxos/ui-editor@0.14.0
  - @dxos/ui@0.14.0
  - @dxos/halo@0.14.0
  - @dxos/halo-react@0.14.0
  - @dxos/async@0.14.0
  - @dxos/invariant@0.14.0
  - @dxos/keys@0.14.0
  - @dxos/log@0.14.0
  - @dxos/util@0.14.0
  - @dxos/react-focus@0.14.0
  - @dxos/react-hooks@0.14.0

## 0.13.0

### Minor Changes

- 3672aff: The project timeline (Gantt) draws its chart again beside the lane names, and its panel scrolls vertically with a thin scrollbar when the lanes outgrow it. An object card's title is one truncated line by default (pass `lines` to `ObjectCard.Header` to clamp to more), and the card popover is only as tall as its content rather than at least `--spacing-card-min-height`.
- 2f95d25: The project timeline is two columns: lane names and the chart. A lane's token and tool counts move into a hover card over its name, and a new `Gantt.LegendToggle` beside the axis switch shows the counts in that column instead (`legend` / `onLegendChange` on `Gantt.Root`, persisted with the project view). The chart scrolls both ways in one area with the horizontal scrollbar at the panel's foot, and is keyboard-navigable: clicking a node focuses the chart, the arrow keys move between lanes and along the timeline, and Space toggles the node's card (Enter selects it). A parent task's bar no longer starts after its sub-tasks'. In a flat deck, a plank's breadcrumbs show its place in the tree (e.g. a session's project and Sessions branch) rather than the navigation history.

  **Breaking:** `Gantt.Meta` is removed (its content is the legend's hover card and stats mode), and `Gantt.Chart`'s ref is now the `svg` element.

- 7715216: UI layout primitives get simpler, typed APIs; heavy components move into their own packages; and the chat bounds what an agent can queue or spend on its own.

  **Breaking:**

  - `Grid`'s `cols` and `rows` take typed track tokens instead of raw CSS: `'fill'` (a flexible track that may shrink below its content), a number (a share of the free space, also shrinkable), `'min'`/`'max'`/`'auto'` (sized to the content), or a length such as `'18rem'` or `var(--…)`. A count is that many equal `fill` tracks, and `grow` now defaults to `false`.
  - `Spinner` is now an interface (`SpinnerProps`, with an `ActivityState` of `'ready' | 'thinking' | 'alert' | 'error'`) with two implementations: `ShapeSpinner`, the morphing square (its states were `pulse`/`spin`/`flash`), and `PulseSpinner`, a dot matrix. Import spinners from the root of `@dxos/react-ui-components`, whose `./Spinner` subpath is removed.
  - `QueryEditor`, `QueryForm` and `useQueryBuilder` move to the new `@dxos/react-ui-query` (translations at `@dxos/react-ui-query/translations`), and `Html` with its colour-scheme and email transforms moves to the new `@dxos/react-ui-html`, so `@dxos/react-ui-components` no longer carries CodeMirror, `@dxos/echo-query` or DOMPurify. `Matrix` moves to `@dxos/react-ui-experimental`.
  - The `dx-fullscreen` utility is renamed `dx-cover` (`absolute inset-0`): it covers the nearest positioned ancestor, not the screen.
  - `ScrollArea.Root` hides its overlay thumbs until the pointer is over the frame (`autoHide` defaults to `true`).

  **Fixes and behaviour:**

  - A popover whose content mounts after it opens (the chat thread outline's card) is positioned beside its anchor instead of the viewport's top-left corner.
  - The chat prompt takes at most three prompts queued behind a running turn (`maxQueue`), on every submit path; queued prompts are small, right-aligned rows flush with the status chip.
  - An agent may wake itself with alarms at most `Alarm.MAX_SELF_WAKES` (10) times in a row without a user prompt; each wake-up prompt states how many remain, a later alarm is dropped without a turn, and the chat status shows the count beside the next wake time.

- 1737cad: `@dxos/react-ui` is rebuilt on Ark UI primitives styled by plain `dx-*` component CSS, and every UI package and plugin
  renders on it; the former component APIs are removed.

  - Components are exported flat by name (`Button`, `Toolbar`, `Card`, `Panel`, `Container`, `Field`, `Input`, `Combobox`,
    `Menu`, `Tabs`, `Main`, `Splitter`, `Toast`, `Tour`, `Banner`, `Empty`, …) and sized by `data-size` scopes (`xs`–`xl`;
    `Size` is that scale). `Container` lays out rails and subgrids, `ControlFrame` frames a control with adornments
    (`Input copyable`, `variant='mono'`), and `useMainLandmark` declares the app's focus areas (Tab and Arrow Left/Right
    move between them). `Combobox` adds a trigger mode, option descriptions, a create row and async results. `Label` is
    no longer public (use `Field.Label`), and the flow helper is `Match` (`Match.Root`/`Match.Case`).
  - `@dxos/react-ui-list` provides `Listbox`, `OrderedList` and `Tree` (virtual rows, drag and drop, disclosure
    animation); `@dxos/react-ui-form` provides `Form` (`Root`, `Viewport`, `Content`, `Fields`, `Actions`, …),
    `ObjectProperties`, `ObjectPicker`, `ViewEditor` and `RefEditor`; `@dxos/react-ui-menu` renders `ActionToolbar` and
    `ActionMenu` on the new Toolbar and Menu; `@dxos/app-toolkit` adds the `ObjectCard` composite.
  - `@dxos/ui-theme` renames the text tokens to `--color-fg`/`fg-muted`/`fg-subtle` (`text-fg`, `text-fg-muted`,
    `text-fg-subtle`; Typography and Icon `tone='muted' | 'subtle'`) and `--color-subdued-separator` to
    `--color-separator-subtle`, adds `--color-focus` for the keyboard focus ring, and derives the control fill from one
    offset off its host surface in both themes.
  - `@dxos/echo` adds `Annotation.ArrayPresentationAnnotation` (`ordered`, `display: 'tag' | 'title'`) for reference
    arrays; `@dxos/effect` `SchemaEx.getProperties` keeps an annotated optional field's annotations; `@dxos/ui-editor`
    markdown tables keep empty cells; `@dxos/plugin-markdown` marks `Document.description` as markdown, and the rename
    popover shows an object's properties.

  Breaking: the former `@dxos/react-ui` component APIs and the transitional `Next` namespace are gone; import components
  from `@dxos/react-ui` by name and use the renamed theme tokens.

- 3022878: The selection companion stacks the selected objects as plain cards in one scroll area with a small gutter, and its "No objects selected" banner sits in the same column, where the first card would. A form's nested object shows its label and disclosure above the bordered group of its fields rather than inside it. `Banner.Root` takes `inset` to override its own gutter, for a host that already pads it.

  **Breaking:** `Instructions` no longer has a `description` field (nothing read it), and `Instructions.make` no longer accepts one.

- a449958: Task lists, trees and the chat prompt are reworked on the react-ui components.

  - Task list rows and the task editor place their cells by column name on one shared template, so the editor's fields, pickers and cancel sit in the rows' columns. The editor creates with an estimate and a priority, saves from an end adornment on its title field, and always takes the list's grid. `TaskList.Root` adds `flush`, `showAssignees` and `showMnemonics`; the leading column holds one reference button that shows the ordinal and copies the task's URI. `TaskProperties` and `TaskHistory` are top-level components, and the task's reference heads `TaskProperties`.
  - **Breaking:** `Grid` no longer grows by default (pass `grow` to fill and clip its parent), matching `Flex`. `TaskEditor` and `TaskOrdinal` are removed (the task article renders a form over the `Task` schema, whose description is Markdown), `TaskMnemonic` is no longer exported, and `TaskList.Editor` drops `grid` and `showControls`.
  - `Tree.Content` has no gutter by default and pads row ends (`rowInset`), so row highlights run edge to edge under an overlay thumb. A deferred `ActionMenu` keeps the focus an outside click moved; `ActionToolbar` takes a `start` slot.
  - `Form.Root` takes `markdownExtensions`. Popup options sit in an equal inset, an empty `Select` opens no popup, `Select.Trigger` takes `fixed`, a splitter drag no longer dims its panes, and clickable tags keep their hue's text colour.
  - Surface modules in plugin-client, plugin-preview and plugin-file declare every role they bind.

### Patch Changes

- 66727e3: Fixes found driving a Composer basics demo. Creating an object from an `@` link keeps the typed name. Creating a type now opens its table, from the create dialog and from the debug object generator. Types and views navigate to their node in the Database section instead of a plank stuck on "Loading…". A table can be created without picking a type: it gets a new type named after it. The table's add-column button appears for a database type. The type and location pickers in the create forms list their options and show their labels. A map created on a table's type offers the type's location properties. Toggling a world-view map shows the whole globe.
- 665261a: The Create Space dialog puts the icon and colour pickers side by side, and its Cancel and Create buttons end at the fields' edge rather than in the gutter. Across forms, a control narrower than its field (a picker button) now starts under its label instead of centring.
- 945092e: Layout and contrast fixes for the new `@dxos/react-ui` components:

  - Forms in a dialog or popover now line up with the host's columns, and a form in a popover takes the popover's surface.
  - Combobox and select triggers placed directly in a form span the form's content column.
  - A panel no longer shifts its body under the header when focus scrolls it.
  - List rows with a description keep their icon and actions on the title's line.
  - A scrolling block in a settings row (such as the debug port log) spans the row instead of collapsing to zero width.
  - The log list scrolls inside its panel, an expanded entry opens beneath its row, a clicked row is ringed as current, rows' checkboxes are optional (`Logger.List checkable`), and the drawer's focus ring is no longer hidden by its panes.
  - Row hover and selection are lower-contrast, and a fieldset's collapse button is a ghost button.
  - The `description` of Project, Task, TaskSet, Milestone, Organization, Issue, PullRequest, Event, Pipeline, Skill, Routine and Script is `Format.Text`, so forms edit it as multi-line text; `Format.Text` is also on the `Format` namespace from `@dxos/echo/Format`.
  - The task set's add-task editor stays at the bottom, below the list.
  - Popovers are unpadded by default (the call site sets the inset; Body and Header keep theirs); a popup's arrow no longer covers its first highlighted row; menu checkbox and radio rows show the action's icon with a trailing check; an inheriting Container whose parent is no grid lays out its own column.
  - `Select.Trigger`'s `fit='options'` is now the boolean `fixed` (the trigger keeps its widest option's width); a selected tab takes the control fill.

- 6a7bed4: A ScrollArea contains overscroll only along the axis it scrolls, so a vertical two-finger swipe over a horizontally scrolling area (such as the project timeline's chart) scrolls the panel around it instead of being swallowed.
- 4f8e566: Card layout cleanups. A grid `Card.Root` takes `gutter` (`rail`, `md` or `lg`) to widen its rails; stats cards use `lg`, so their rows sit further in at the same text size. `Card.Row` takes `end`, content centred in the end rail (unlike `trailing`, which reaches back into the content track); stats rows put their controls there, centred, and their units at its start, so values end on one edge. Every stats card header has one layout: the icon in the start rail, the title and optional info as a two-column grid, and the button or menu centred in an end rail that is kept even when empty, so the info ends at the same edge on every card. An icon-only button inside a `Block` no longer adds its own inset, which had pushed it off-centre in the cell. The Surfaces card shows a selected role's surfaces as JSON blocks again (a label row had clipped them to nothing), and the EDGE, Indexer and Sync cards show each space's name or id beside its copy button rather than a bare icon. `Card.Row` takes `span` — `full` across both rails, `end` on through the end rail — in place of hand-written grid-column overrides, and a markdown card's word count now spans the rails as its snippet does, so the two start at the same edge. A parent task's timeline lane carries every descendant's start and finish as nodes, read from the task tree, so its first node is where its sub-tasks' work began even when they are not on one checklist. The project timeline's horizontal scrollbar spans only the chart, not the sticky lane names, via a new `trackStart` on `ScrollArea.Root`. The debug port's session id is a disabled copyable input, as the Space ID is. A form's markdown field (e.g. a task's description) fills its frame and wraps long tokens such as an inline-code URL, so it no longer scrolls sideways with its scrollbar mid-field.
- Updated dependencies [ecd099a]
- Updated dependencies [bbe9f18]
- Updated dependencies [d2a6aad]
- Updated dependencies [162fd6d]
- Updated dependencies [aad3e41]
- Updated dependencies [44b7b80]
- Updated dependencies [bb2b672]
- Updated dependencies [cb1e218]
- Updated dependencies [1ef899b]
- Updated dependencies [32f32a0]
- Updated dependencies [dc16fdd]
- Updated dependencies [66727e3]
- Updated dependencies [469e7f7]
- Updated dependencies [665261a]
- Updated dependencies [68dc875]
- Updated dependencies [2e96a73]
- Updated dependencies [ab1bddf]
- Updated dependencies [ec9f207]
- Updated dependencies [945092e]
- Updated dependencies [c531b05]
- Updated dependencies [eb14798]
- Updated dependencies [3672aff]
- Updated dependencies [2f95d25]
- Updated dependencies [69a4a85]
- Updated dependencies [c7cc480]
- Updated dependencies [7d222fc]
- Updated dependencies [8980a93]
- Updated dependencies [e99ee70]
- Updated dependencies [161f994]
- Updated dependencies [ff92c50]
- Updated dependencies [3e73e53]
- Updated dependencies [7a177b9]
- Updated dependencies [9ab98cd]
- Updated dependencies [8fc641a]
- Updated dependencies [38e2ddb]
- Updated dependencies [1894fc1]
- Updated dependencies [246ee3c]
- Updated dependencies [8ebe8d6]
- Updated dependencies [596728d]
- Updated dependencies [64f1a7a]
- Updated dependencies [7715216]
- Updated dependencies [1b37aa8]
- Updated dependencies [1737cad]
- Updated dependencies [321c99f]
- Updated dependencies [3d05b7f]
- Updated dependencies [a999417]
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
  - @dxos/react-ui-menu@0.13.0
  - @dxos/compute@0.13.0
  - @dxos/react-ui@0.13.0
  - @dxos/echo@0.13.0
  - @dxos/react-ui-form@0.13.0
  - @dxos/util@0.13.0
  - @dxos/types@0.13.0
  - @dxos/plugin-space@0.13.0
  - @dxos/ui-editor@0.13.0
  - @dxos/app-toolkit@0.13.0
  - @dxos/client@0.13.0
  - @dxos/plugin-client@0.13.0
  - @dxos/app-framework@0.13.0
  - @dxos/assistant@0.13.0
  - @dxos/react-ui-attention@0.13.0
  - @dxos/echo-client@0.13.0
  - @dxos/react-ui-editor@0.13.0
  - @dxos/plugin-attention@0.13.0
  - @dxos/plugin-graph@0.13.0
  - @dxos/react-client@0.13.0
  - @dxos/react-ui-components@0.13.0
  - @dxos/react-ui-dnd@0.13.0
  - @dxos/echo-doc@0.13.0
  - @dxos/echo-react@0.13.0
  - @dxos/client-protocol@0.13.0
  - @dxos/schema@0.13.0
  - @dxos/versioning@0.13.0
  - @dxos/async@0.13.0
  - @dxos/effect@0.13.0
  - @dxos/log@0.13.0
  - @dxos/react-focus@0.13.0
  - @dxos/react-hooks@0.13.0
  - @dxos/halo@0.13.0
  - @dxos/halo-react@0.13.0
  - @dxos/invariant@0.13.0
  - @dxos/keys@0.13.0
  - @dxos/ui@0.13.0
  - @dxos/ui-theme@0.13.0

## 0.12.0

### Minor Changes

- 2800d03: New `Annotation.SetParent` marks a `Ref` field (or an array-of-`Ref` field) as owning its targets: writing a ref into the field, or creating the holder with one, now sets the target's ECHO parent automatically, so the child cascade-deletes and deep-clones with its holder. Nested struct fields and members of a discriminated union field are covered too.

  Types across the repo now declare ownership on the field instead of calling `Obj.setParent` next to every write — `Instructions.text`, `Outline.content`, `Project.{instructions,outline,taskSet,routines}`, `Chat.feed`, `Agent.instructions`, `File.data`, `Channel.backend.config`, `Document.content`, `Mailbox`/`Calendar`/`Search`/`Subscription` feeds and tag indexes, `Routine.{spec.instructions,triggers}`, `Scene.objects`, `Terra.objects`, and `Artifact.variants`. Removing a ref still does not clear the target's parent; call `Obj.setParent(child, undefined)` for that.

- 3aa3d63: Bind credentials to Claude-managed agent sessions by AccessToken reference, upsert or revoke them on a running session, and carry required scopes on the connector prompt.
- 75971ad: Add plugin management to the CLI. `dx plugin add <url>` fetches a manifest and snapshots it and the bundle under `plugins/<id>/`, so the install is self-describing on disk and needs no network afterwards; `add --dev <path>` reads a directory in place, falling back to its `dx.config.ts` when there is no built manifest, and may override a builtin of the same id. Installing asks for confirmation before any third-party code is evaluated — the plugin runs with the CLI's identity and `dx mcp serve` exposes its operations to agents — and non-interactive callers must pass `--yes`. Both enable by default (`--no-enable` stops at install) and print the resolved plugin id; `remove` deletes a snapshot or forgets a linked directory. Installed plugins register from metadata cached at install time, so a plugin's code is imported only once something enables it, and one that fails to import is reported by `dx plugin list` instead of failing every command. `dx plugin list` now reports `installed`, `enabled`, `core` and the plugin's source as separate fields rather than one collapsed status, with `--enabled` to filter; `enable`/`disable` are idempotent and fail with actionable messages. Hosts can supply their own core plugin set through `PluginManager`'s new `core` option instead of inheriting every `system`-tagged plugin, which is how telemetry, connectors and routines became disableable in the CLI; its demo plugins are no longer enabled by default. A profile whose enabled list is empty is no longer re-seeded with the defaults. A plugin installed from a URL has its `@dxos/*` imports served from the host's own modules, so it shares the CLI's instance of ECHO's schema registry and the capability system rather than loading its own copy; the shared-package list is exported as `@dxos/app-framework/SharedPackages`.
- a3b6ef0: Migrate the entire monorepo from Effect 3 to Effect 4 (`effect@4.0.0-rc.108`). **This is a breaking change**, carried as a minor because the fixed publish group is pre-1.0.

  Every `@dxos` package now builds against the consolidated `effect` package — `@effect/platform`, `@effect/rpc`, `@effect/cli`, `@effect/sql-*`, `@effect/ai` and `@effect/printer` usages moved to their `effect/unstable/*` counterparts (or were vendored where v4 ships no counterpart). Consumers embedding `@dxos` packages must be on the Effect 4 line: v3 and v4 cannot coexist in one bundle.

  Consumer-visible API consequences include: schemas are values rather than extensible classes (statics such as `SpaceId.random` are merged onto the schema value), `Schema`-derived types follow v4 shapes (`Codec`, checks instead of refinement nodes, string annotation keys), and `Either`-based results became `Result`.

  The AI tool surface changed with it. An `Operation` now projects to a **dynamic** tool carrying the JSON Schema shown to the model, because v4 describes an Effect-schema tool through the provider's structured-output codec while validating the model's arguments against the untransformed schema — a record was advertised as an array of `[key, value]` pairs but validated as an object, and an optional key was advertised nullable-and-required but validated as absent-or-`T`, so a compliant model was always rejected. Tool arguments are decoded at the execution boundary instead, which is also where a ref supplied as a URI string becomes a `Ref`. Alongside it, an open record (`Schema.Record(String, Any)`) now serializes with an explicit `additionalProperties: true`: v4 omits the keyword when the value type is unconstrained, which made a persisted schema round-trip back as a closed struct that accepted no keys.

- 8ea2bf9: Render a task set as the sub-task tree it stores, restructurable by dragging a row's handle or with `Alt`+arrow. `TaskList` gains `hierarchical`, `onTaskMove` and controlled `collapsed` state; `Listbox.Item` accepts `onKeyDown`; and the `MoveTask` operation takes an optional `parentTask` so a drop re-parents and repositions in one mutation.
- 2a41efd: Let a planning agent ask the user a question and resume on the answer.

  An agent working a checklist had two options when it hit something it could not decide: guess, or
  stop. `ask-question` is the third. It takes the exact title of a checklist task, files a durable
  `Question` on that task as an artifact, and moves the task to `blocked` — so the checklist says what
  is waiting and on whom, rather than showing work that nothing is advancing. The question may carry
  suggested answers; the surface that renders it always offers a free-form field besides them, since
  the point of asking is that the asker did not know.

  Answering records the answer on the object and sends the conversation a synthetic prompt naming the
  question, which the agent reads back with `get-objects` before continuing. The answer is not quoted
  into that prompt: it lives on the object, so the agent sees whatever the reader actually chose,
  including a later edit. The task is left `blocked` for the agent to clear — only it knows whether
  the answer unblocked anything.

  `question.asked` and `question.answered` join the trace alongside the status change, so the stretch
  a task spent waiting on a person is visible on the session timeline.

- 93c7523: Enable the Plugin Manager skill in new chats on extensible hosts, and have it search the installed
  plugins for the one best suited to a request rather than only reacting to a disabled name it spots.
- 4a71ef2: Add a Plugin Manager skill so the assistant can list installed plugins — including disabled ones — and offer a disabled plugin to the user as an inline prompt whose button enables it via the new registry `EnablePlugins` operation.
- 987f7e1: Replace each plugin's `./plugin` entrypoint with an `XPlugin` namespace. **Breaking:** import the plugin from its own subpath and construct it with `make` — `import * as ChessPlugin from '@dxos/plugin-chess/ChessPlugin'; ChessPlugin.make()` in place of `import { ChessPlugin } from '@dxos/plugin-chess/plugin'; ChessPlugin()`. Plugin metadata is available as `XPlugin.meta` without loading the plugin body. **Breaking:** `@dxos/plugin-graph` no longer re-exports `@dxos/app-graph`, which now publishes per-namespace subpaths: `AppGraph`, `AppGraphBuilder` and `AppGraphNode`. The old `NodeMatcher` splits by member — the generic combinators (`whenRoot`, `whenId`, `whenNodeType`, `whenAll`, `whenAny`, `whenNot`) move to `@dxos/graph/GraphNodeMatcher` and the ECHO-aware ones (`whenEchoObject`, `whenEchoObjectMatches`, `whenEchoType`, `whenEchoTypeMatches`) to `@dxos/app-toolkit/AppNodeMatcher`.
- e7fc023: Replace each plugin's `./operations` and `./skills` barrel entrypoints with per-symbol subpaths. **Breaking:** import a handler set from its own subpath and read it off the namespace — `import * as MarkdownOperationHandlerSet from '@dxos/plugin-markdown/MarkdownOperationHandlerSet'; MarkdownOperationHandlerSet.handlers` in place of `import { MarkdownOperationHandlerSet } from '@dxos/plugin-markdown/operations'` — and import a skill from its own subpath, e.g. `import * as MarkdownSkill from '@dxos/plugin-markdown/MarkdownSkill'`. **Breaking:** plugin root barrels no longer re-export handler sets or skills, so those names must come from their subpaths. `@dxos/plugin-inbox` additionally publishes `./FeedCursor` and `./MessageExtractor`, and `@dxos/plugin-projects` renames `CodeProjectSkillDefinition` to the `./CodeProjectSkill` namespace.
- 142ba02: Sync plugin settings and the plugin set through the settings space, so they follow the identity across devices. Settings are shared by default; a plugin's settings panel can be switched to this device only from its header, and the plugin registry offers a matching switch for using a different plugin set on one device.
- 0280a6a: Retire the `/types` aggregate entrypoint in favour of the per-namespace subpaths.

  `@dxos/plugin-*/types` re-exported every namespace of a plugin from one module, so a
  single import statically pulled in all of them. These are Effect/ECHO schemas — runtime
  values rather than erased types — so the aggregate defeated the per-namespace subpaths
  it sat alongside and kept the plugin's whole schema graph in the eager module graph.

  Breaking: the `./types` export is removed from every plugin that published it. Import the
  namespace you need instead — `@dxos/plugin-chess/Chess` rather than
  `@dxos/plugin-chess/types`. The `dxos-subpath-imports` lint rule autofixes call sites.

  Plugins whose barrel mixed namespaces with flat exports gained real modules for those
  exports (`ConnectorAnnotations`, `SettingsPath`, `AssistantOptions`, `SpaceSchema`, and
  others); plugin-client and plugin-space additionally had their `export namespace X` wrappers
  unwrapped, so `X.X.member` becomes `X.member`.

### Patch Changes

- 86d1482: Let a dev server start the agent debug port on a known session, and let plugins contribute
  slash-menu commands to the markdown editor.

  `DebugPortStartOptions` gains `session`, so a caller that already knows the id skips the
  copy-the-id handshake. `MarkdownCapabilities.MenuExtension` is a new multi capability: an entry
  names an Operation (not a callback), and contributions are grouped by the contributing plugin.

  Also renames the settings-panel operation's key to `org.dxos.operation.appToolkit.openSettings`.
  It collided with `LayoutOperation.Open`, so neither could be resolved by key alone.

- 9049c30: Fix ECHO array-field appends inside `Obj.update` to mutate in place instead of copying the whole array on every push, and retype `ScrollToAnchor`, `DeleteMessage`, and `MergeDuplicates` operation fields to hold typed refs instead of bare ids so handlers no longer have to re-resolve what they point at.
- 34a8433: Order module activation by capability dependencies instead of hand-wired events.
  A module declares the capabilities it `requires` and `provides` (or a runtime
  `activatesOn` event) and the plugin manager topologically orders activation from
  that graph. Capabilities are yieldable Effect services, so accessing an undeclared
  capability or omitting a declared one is now a type error, and missing providers,
  dependency cycles, and duplicate providers fail fast with tagged errors instead of
  runtime assertions. Plugins compose as a flat chain of `Plugin.addModule` over
  module bodies authored with `Capability.lazyModule` (code-split) or
  `Capability.inlineModule` (eager), or with a per-capability maker from the new
  `AppCapability` namespace (`surface`, `settings`, `appGraphBuilder`, `translations`,
  `schema`, ...) that bakes in the module name and default provides. A module is an
  opaque `Capability.Module<Options>`, parameterized only by its options type, so a
  module export never leaks a foreign capability's type into declaration emit.

  Every plugin in the repository is migrated to this API. The plugins gain no
  behaviour of their own from the change, but any plugin defined outside the
  repository must be migrated too — the legacy API is removed, not deprecated.

  Breaking: the legacy event-wiring API is removed — `AppPlugin` and its
  `addXModule` helpers, `firesBeforeActivation`/`firesAfterActivation`, `compatFires`,
  and the ordering-only `Setup*`/`*Ready` activation events (genuine runtime events
  remain). `Capability.provide`/`provideAll` are renamed to
  `Capability.contribute`/`contributeAll`, and the untyped raw builder
  `Capability.contributes` is removed. Multi is now the default capability arity:
  `Capability.make` defines a multi (registry) capability and
  `Capability.makeSingleton` the single-provider case, both curried
  (`make<T>()(nsid)`) so the NSID literal brands the identifier. The
  `withPluginManager` `capabilities` test option now accepts `Contribution[]`.

- 28ad891: A chat's retained model is now resolved through a provider that actually serves it. Model ids are provider-scoped, so a conversation that kept its model selection across a provider change was handed whichever provider the settings named and failed to resolve. The active provider is still used whenever it serves the selected model, which keeps a local model on the sidecar, Ollama or LM Studio instance actually in use.
- 3958355: Import `dx.config.ts` directly instead of transpiling it, so `dx registry publish` can read a plugin config from the compiled CLI.
- ba08e65: Evaluate `dx.config.ts` in a node subprocess, so the compiled CLI reads a plugin's config the same way every other runtime does.
- 4800a6f: Restore a markdown document's scroll position when navigating back to it: the position is now recorded as you scroll (not only when the caret moves), read back on mount, and re-anchored to the exact pixel rather than the enclosing line.
- 5b99c47: An inline object embed whose target was deleted now shows an "Object not found" chip inline after its source, which stays editable, instead of an empty box at the label's reserved height; card embeds no longer reserve a section's height. A block embed is atomic to the caret: one arrow press steps over it instead of two invisible stops. Link widgets can report `unresolved`/`intrinsic` to the editor via `setLinkWidgetState`, block widgets can opt into `keepAlive`, and the placeholder no longer inherits a replaced widget's element or reserved height.
- 181f374: An inline embed that renders as a section after having rendered as a card takes its reserved height back.
- 4c107a2: Support combining a full-text search filter with type filters via `Filter.and` — the query planner pushes the type scope down into the FTS index instead of rejecting the query as too complex. The search plugin now scopes full-text results to user-visible types (the same set the nav tree's Database section lists, plus collections), so search no longer surfaces internal objects such as views, stored schemas, or relation rows, and each result takes its icon from the type's annotation like the nav tree and cards do. Mailbox search stays scoped to the active tag view when combining free text with tag terms. Search is now a system plugin, always enabled rather than opt-in under Labs.
- 0132aab: Arrow keys move between listbox rows again when a row carries its own controls (a task row's status toggle no longer swallows the keypress), a textarea's text is inset like an input's rather than sitting against its border, and a toolbar's density now reaches the controls inside it instead of leaving them at the default size. Markdown edited in place wraps, shows a caret against a dark surface, and takes Tab straight into the text. **Breaking:** `TaskList.Create` is now `TaskList.Edit` — it edits the selected task and creates one only when nothing is selected.
- b600f72: Remove LevelDB and the `@dxos/kv-store` package. Automerge document storage, heads, and the query index are now backed exclusively by SQLite. Profile export/import no longer reads or writes a LevelDB store — legacy `KEY_VALUE` archive entries are skipped on import.
- ea11703: Replace the dead `bs-*`/`is-*`/`pli-*`/`plb-*`/`mli-*`/`mlb-*`/`pis-*`/`pie-*` Tailwind classes with their physical equivalents; they came from `tailwindcss-logical`, removed in the Tailwind v4 migration, and had been generating no CSS.
- 5913020: Importing a public pull request no longer fails because of the space's GitHub connection: a request the stored token could not make is retried anonymously on 403 and 404 as well as 401.
- 818a096: Inline object embeds in markdown documents are focus-gated: an embed is inert until clicked, so the wheel scrolls the document rather than the sketch or embedded document; once attended it takes input, shows a subtle focus border, keeps keys and scroll chaining inside, and returns focus to the editor on Escape. Document cards fade their snippet into the card on any surface. Theme ring tokens (`ring-focus-line`, `ring-offset-focus-offset`) survive `mx()` beside a ring colour. Scenes (`@dxos/plugin-spacetime`) render a card preview in object grids, remember their camera pose per scene, always save a selected object's colour change, and orbit with half the inertia. Mermaid diagrams (`@dxos/plugin-mermaid`) and tldraw canvases (`@dxos/plugin-tldraw`) follow the app's colour mode and design-system tokens; `mermaid()` accepts `theme`/`themeVariables`/`themeCSS`. Deleting a single card from a type view (`@dxos/plugin-space`) is undoable.
- 043c792: Typing in a markdown document no longer re-renders the editor article, the Properties panel or the Comments panel on every keystroke. A document whose first line is a single word longer than 32 characters now gets that word, truncated, as its fallback title instead of `…`.
- 0ac2e5f: Three fixes to the operation surface the MCP server projects.

  `space.queryObjects` with a `typename` filter under-returned, nondeterministically: the typename was resolved to one registered `Type` entity and the filter built from that entity's identity — a versioned `dxn:` for a static declaration, an `echo:` id for a copy persisted in the space. Objects of the same typename written under any other registration did not match, and which registration was picked depended on the order the registry query happened to return, so the same call could answer with every object, some of them, or none. The typename now filters as the bare-typename DXN `Filter.type` documents for this case; the registry is consulted only to reject a typename nothing declares.

  `projects.get` and `tasks.list` timed out on a task set with members. Loading a set's tasks resolved the refs one at a time, each a separate indexed query, and an unresolvable ref does not fail — it waits out the resolver's own 30s timeout. Materialized refs are now read from the working set, the cold remainder resolves concurrently, and a ref that does not resolve within 5s is treated as gone.

  `tasks.getOutline` given a ref to something that is not an outline now fails with a typed `InvalidOperationInput` naming the actual typename, rather than throwing `TypeError: Cannot read properties of undefined (reading 'tryLoad')`.

  Adds `Database.makeRef`, the Effect wrapper around `db.makeRef`.

- ebb8f4a: Task-set operations now work over MCP (DX-1217). `tasks.list`, `tasks.listMilestone`, and `projects.get` load the set's member refs instead of resolving them synchronously, so a set written in one session no longer reads as empty from another; new `TaskSet.loadTasks`/`loadMilestones` carry that behaviour. `tasks.create` and `tasks.createMilestone` flush the new object before the set references it, so a crash mid-create can no longer leave the set pointing at an object that was never stored — and readers skip any dangling ref left behind. `space.updateObject` converts `{"/": "echo:..."}` ref envelopes at any depth, so ref-array properties can be patched. The project skill's setup instructions call `whoami` instead of the removed `listSpaces`.
- 770c73d: A pull request import that fails now says why: a GitHub connection the API rejects asks you to reconnect, a repository the connection cannot see is named as such, and the HTTP status appears alongside the reference.
- 1b6e258: Show recorded demos of markdown, sheet, thread, illustrator, support and search on their plugin details pages.
- 1ab4bb8: Single-entry plugin authoring: `Plugin.addModule` skips `undefined` (headless barrels stub excluded modules), module specs and makers accept an `environments` annotation, and `@dxos/app-framework` ships a `dx-plugin` bin that generates the per-environment `#capabilities` barrels (`src/capabilities/gen/`) and syncs the package.json condition map from those annotations.

  Every `@dxos/plugin-*` package now authors a single canonical `plugin.ts(x)` and `capabilities/index.ts` on this pattern, instead of hand-maintained `plugin.node.ts`/`plugin.workerd.ts`/`capabilities/{node,workerd}.ts` variants. This migration also fixed two real drift bugs the hand-maintained variants had introduced: `plugin-client` and `plugin-routine`'s node-environment `OperationHandler` now activates on the `Startup` wave, matching browser and workerd, instead of silently defaulting to `Idle`.

  `@dxos/react-ui-assistant` gains a `./translations` export so consumers can take its translation resources without pulling the React root barrel.

- 22c7a70: Opening an artifact or a session chat from a project now adds a plank beside the project instead of replacing it.
- 256f286: Projects gain a lifecycle `status` field (`active | paused | blocked | ended`), surfaced through the MCP-projected verbs, and plugin-projects ships a project-management skill for external agents — including the `/codeProject setup` flow that binds a repo to an existing space. The skill's key segment is `codeProject` because the segment doubles as the projected MCP prompt name and plain `project` belongs to assistant-toolkit's own skill.

  `toEffectSchema` recognizes ECHO's reference sentinel before the generic `type: 'object'` branch, so a reference node widened with structural keywords (as a wire boundary may do for schema-unaware consumers) decodes as a reference instead of a plain struct. Serialization is unchanged — persisted schemas stay byte-identical to previous releases.

  Worker (`workerd`) bundles no longer pull in React. Wrangler resolves `workerd, worker, browser` and never `node`, so a `#capabilities` map offering only `node` and `default` handed workers the browser barrel and its React surfaces. Every plugin with a headless entry now resolves a server-safe barrel under a `workerd` condition, and the `check-module-structure` guards trace with `workerd,worker` — the conditions a worker actually resolves — so a reintroduced leak fails the check instead of passing against a build that is never shipped.

- d7b0a3b: `dx registry publish` authenticates the edge upload with `DX_HUB_API_KEY` when set, so headless callers without a HALO identity can publish.
- ea11703: Add an agent debug port to the devtools hook (`dxos.debugPort`) that evaluates snippets delivered by a loopback server, and surface start/stop plus the session id in the Debug plugin's settings. Off by default, activated only by an explicit gesture, and never persisted.
- 72b2984: `Task.edit`, `Task.setStatus`, `Task.assign` and `Task.appendHistory` write a field and the activity-log entry describing it in one transaction; an edit that changes nothing records nothing. `UpdateTask` goes through them, so a patched task now carries its own history.

  `Task` gains `reviewers` (an optional `Actor` array), `artifacts` (refs to what the task produced), and a `review` status — a task with reviewers lands there rather than `done`. Bumped to `0.5.0`.

  **Breaking:** `TaskEdit` and `TaskDraft` are gone from `@dxos/react-ui-task` — the editable surface of a task now has one definition, `Task.Edit` and `Task.Draft` in `@dxos/types`, shared by the list UI, the mutation helpers and the `UpdateTask` operation. `UpdateTask` accepts `null` to clear `description`, `priority`, `estimate` and `assignee`; it could previously set an assignee but never remove one.

  **Breaking:** `Task.Event` is now `created | updated` — the `status-changed`, `assigned`, `moved`, `commented` and `delegated` literals are gone, and a history entry's `description` is optional. Nothing wrote the log before this release, so no stored task carries a removed value.

  A plugin can now put a menu item on another plugin's object: `ObjectAction<T>` in `@dxos/app-toolkit` is the shared shape, and a host declares a capability over it. plugin-tasks declares `TaskAction`, so a task row shows contributed actions — plugin-projects contributes `Discuss in chat`, which opens a chat carrying the task in its checklist.

  **Breaking:** `TaskList.Root`'s `onTaskDelete` is replaced by `getTaskActions`, which returns the row's menu items; delete is now an ordinary action the container supplies. One item renders as a button, several as an overflow menu.

  **Breaking:** a chat's checklist no longer owns the tasks on it. `Chat.tasks` was an owning field, so adding a task re-parented it — a task delegated from a project disappeared from that project's task list. `Chat.addTask` parents what it creates, a delegated task keeps the parent it arrived with, and `Chat.deleteTask` deletes only members the chat owns. `AssistantOperation.RunPromptInChat` opens a chat and queues its first turn, which is how delegation now starts one: a session spawned outside the chat's UI carries a different model, and the mismatch terminated the running process mid-turn.

- 559acfa: Fix the TaskSet article and section surfaces never rendering (the Tasks section of a Project article was empty), and the Excalidraw plugin settings surface never rendering — both surface ids ended in a hyphenated segment, which the surface manager drops. Surface and graph-extension ids are now checked at compile time: `id` on `Surface.create`, `Surface.createWeb`, `GraphBuilder.createExtension` and `createExtensionRaw` takes `DXN.Path`, so a malformed literal is a type error instead of a contribution that silently disappears at dispatch. A computed id still falls through to the existing runtime check.
- 8bf4620: Opening a 200-task project no longer blocks the page for over a second: task tree walks
  (`Task.orderTree`, `Task.subtree`, the task list's forest) index parent edges once through the new
  `Task.childIndex`, and `Obj.getParent` caches the resolved parent rather than resolving it on every
  read. `markdown.create`, `sheet.create` and `sandbox.downloadFile` file what they create into the
  space's root collection again.
- 40b50c2: Surface a process's environment (space, conversation) on `Process.Info`, and add a trace panel filter that shows only the processes running in the selected environments.
- Updated dependencies [a92ea18]
- Updated dependencies [0280a6a]
- Updated dependencies [375de88]
- Updated dependencies [0c6c186]
- Updated dependencies [86d1482]
- Updated dependencies [4025ffe]
- Updated dependencies [2cad6c0]
- Updated dependencies [af1c007]
- Updated dependencies [12461e1]
- Updated dependencies [4862c8e]
- Updated dependencies [106d38a]
- Updated dependencies [9049c30]
- Updated dependencies [6186edc]
- Updated dependencies [e3ceced]
- Updated dependencies [d2be597]
- Updated dependencies [6a457ac]
- Updated dependencies [e2eecf2]
- Updated dependencies [2800d03]
- Updated dependencies [4ececc6]
- Updated dependencies [96f94c2]
- Updated dependencies [c95def4]
- Updated dependencies [b47fd84]
- Updated dependencies [3c7b013]
- Updated dependencies [fd873d2]
- Updated dependencies [f4e481a]
- Updated dependencies [b1dc20c]
- Updated dependencies [ac71815]
- Updated dependencies [7c87626]
- Updated dependencies [c020513]
- Updated dependencies [ab734ba]
- Updated dependencies [f48689d]
- Updated dependencies [f82c78f]
- Updated dependencies [1a8043c]
- Updated dependencies [6d52561]
- Updated dependencies [520c34f]
- Updated dependencies [28b7621]
- Updated dependencies [9714c75]
- Updated dependencies [3b78bb6]
- Updated dependencies [a069511]
- Updated dependencies [066b35d]
- Updated dependencies [5df602e]
- Updated dependencies [63fc847]
- Updated dependencies [4a0b78b]
- Updated dependencies [2d58ea5]
- Updated dependencies [34a8433]
- Updated dependencies [bd6ba8e]
- Updated dependencies [0fe00c5]
- Updated dependencies [7560ca7]
- Updated dependencies [b8762ef]
- Updated dependencies [f3f55a8]
- Updated dependencies [85ad256]
- Updated dependencies [2d4107f]
- Updated dependencies [c56ba34]
- Updated dependencies [ea4093c]
- Updated dependencies [069e8ed]
- Updated dependencies [7becabf]
- Updated dependencies [73daef4]
- Updated dependencies [75971ad]
- Updated dependencies [3958355]
- Updated dependencies [fee7666]
- Updated dependencies [fd23a8b]
- Updated dependencies [4e417e9]
- Updated dependencies [577b434]
- Updated dependencies [7d04444]
- Updated dependencies [5262408]
- Updated dependencies [d194929]
- Updated dependencies [6ef35a6]
- Updated dependencies [d17d75a]
- Updated dependencies [557e243]
- Updated dependencies [ea11703]
- Updated dependencies [cff33b7]
- Updated dependencies [5305365]
- Updated dependencies [b2caee6]
- Updated dependencies [9baf25f]
- Updated dependencies [9a36b1e]
- Updated dependencies [5dc2419]
- Updated dependencies [a09e18e]
- Updated dependencies [5d2ee16]
- Updated dependencies [34f7d92]
- Updated dependencies [a3d45c4]
- Updated dependencies [938bd20]
- Updated dependencies [dcf911b]
- Updated dependencies [881f900]
- Updated dependencies [b63506b]
- Updated dependencies [b83b831]
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
- Updated dependencies [7ec1738]
- Updated dependencies [df295b2]
- Updated dependencies [d0beedc]
- Updated dependencies [731b264]
- Updated dependencies [a69d861]
- Updated dependencies [ba08e65]
- Updated dependencies [2643a00]
- Updated dependencies [362fd0f]
- Updated dependencies [dbff1e4]
- Updated dependencies [3ee20ca]
- Updated dependencies [9817b6f]
- Updated dependencies [f38f3ae]
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
- Updated dependencies [99dcc7c]
- Updated dependencies [b3673ee]
- Updated dependencies [915db6a]
- Updated dependencies [3e02201]
- Updated dependencies [6c25ed3]
- Updated dependencies [2e4c299]
- Updated dependencies [4800a6f]
- Updated dependencies [1b62726]
- Updated dependencies [a3b6ef0]
- Updated dependencies [4c55b5d]
- Updated dependencies [b02fe16]
- Updated dependencies [f0d3620]
- Updated dependencies [472ca95]
- Updated dependencies [5b99c47]
- Updated dependencies [49271cd]
- Updated dependencies [0426925]
- Updated dependencies [548e82c]
- Updated dependencies [252ca39]
- Updated dependencies [8fb29b3]
- Updated dependencies [c439ba0]
- Updated dependencies [6af130f]
- Updated dependencies [c8b7158]
- Updated dependencies [2c442f9]
- Updated dependencies [0264069]
- Updated dependencies [2922d36]
- Updated dependencies [d62a947]
- Updated dependencies [872f391]
- Updated dependencies [bd792a6]
- Updated dependencies [8608f03]
- Updated dependencies [51820a1]
- Updated dependencies [9ae0e5f]
- Updated dependencies [7d000b9]
- Updated dependencies [66e9264]
- Updated dependencies [cafa240]
- Updated dependencies [813069c]
- Updated dependencies [84362af]
- Updated dependencies [8cb5553]
- Updated dependencies [9d0132f]
- Updated dependencies [76d6fca]
- Updated dependencies [4c107a2]
- Updated dependencies [26e31c1]
- Updated dependencies [8c20ee2]
- Updated dependencies [b9d72bb]
- Updated dependencies [9477170]
- Updated dependencies [eeff74c]
- Updated dependencies [279f87b]
- Updated dependencies [967b130]
- Updated dependencies [75d9c7c]
- Updated dependencies [0ef896f]
- Updated dependencies [777d24a]
- Updated dependencies [d2f3d87]
- Updated dependencies [48fd9fe]
- Updated dependencies [d90fe83]
- Updated dependencies [3e9a10f]
- Updated dependencies [8ea2bf9]
- Updated dependencies [5cf307d]
- Updated dependencies [48ea128]
- Updated dependencies [8ca2ac7]
- Updated dependencies [2c06e2e]
- Updated dependencies [098a0bb]
- Updated dependencies [72f7584]
- Updated dependencies [e94ed89]
- Updated dependencies [882ac2a]
- Updated dependencies [0132aab]
- Updated dependencies [a74e9b0]
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
- Updated dependencies [9477170]
- Updated dependencies [cc45381]
- Updated dependencies [bcfe4c5]
- Updated dependencies [12b6618]
- Updated dependencies [df0ab57]
- Updated dependencies [ce194c0]
- Updated dependencies [41e2750]
- Updated dependencies [818a096]
- Updated dependencies [4aa6a33]
- Updated dependencies [9636ce1]
- Updated dependencies [0ac2e5f]
- Updated dependencies [9426389]
- Updated dependencies [2e5e188]
- Updated dependencies [ebb8f4a]
- Updated dependencies [4f760ce]
- Updated dependencies [9d2466a]
- Updated dependencies [557e243]
- Updated dependencies [ca34a80]
- Updated dependencies [9f2557b]
- Updated dependencies [29543ca]
- Updated dependencies [e26af7e]
- Updated dependencies [ab79741]
- Updated dependencies [08cddf6]
- Updated dependencies [07531e0]
- Updated dependencies [8efc4f1]
- Updated dependencies [a04ab6e]
- Updated dependencies [47d48cd]
- Updated dependencies [df22dec]
- Updated dependencies [a283607]
- Updated dependencies [40ecd44]
- Updated dependencies [24fcadc]
- Updated dependencies [1160094]
- Updated dependencies [77a2d34]
- Updated dependencies [b00ee72]
- Updated dependencies [4804da0]
- Updated dependencies [61fe676]
- Updated dependencies [2bb84d8]
- Updated dependencies [d4b4919]
- Updated dependencies [63e500b]
- Updated dependencies [b72c1a2]
- Updated dependencies [7c426d4]
- Updated dependencies [064a184]
- Updated dependencies [cd4da46]
- Updated dependencies [ec4f4ca]
- Updated dependencies [78e5596]
- Updated dependencies [5662dfc]
- Updated dependencies [d1a69fb]
- Updated dependencies [b1bb838]
- Updated dependencies [19f19a2]
- Updated dependencies [5959b41]
- Updated dependencies [2a41efd]
- Updated dependencies [139a3b0]
- Updated dependencies [d308bf8]
- Updated dependencies [07514c2]
- Updated dependencies [142ba02]
- Updated dependencies [1ab4bb8]
- Updated dependencies [e1ee9dd]
- Updated dependencies [f17ff25]
- Updated dependencies [a5dfa5e]
- Updated dependencies [f3c02b3]
- Updated dependencies [32468c3]
- Updated dependencies [0a3e9dd]
- Updated dependencies [e2b04f6]
- Updated dependencies [256f286]
- Updated dependencies [306f50d]
- Updated dependencies [8f372ce]
- Updated dependencies [61becad]
- Updated dependencies [6c881a2]
- Updated dependencies [ddc01c6]
- Updated dependencies [690dcaa]
- Updated dependencies [3b09a05]
- Updated dependencies [092f3be]
- Updated dependencies [74f9b30]
- Updated dependencies [b7822a7]
- Updated dependencies [cc9b81f]
- Updated dependencies [c8b65f3]
- Updated dependencies [9feee5e]
- Updated dependencies [f2d8a92]
- Updated dependencies [d005fd9]
- Updated dependencies [0e44f24]
- Updated dependencies [cef0a3b]
- Updated dependencies [bd06669]
- Updated dependencies [c4188a6]
- Updated dependencies [5b504b4]
- Updated dependencies [eb95cd7]
- Updated dependencies [a53cabb]
- Updated dependencies [d7b0a3b]
- Updated dependencies [20e86ba]
- Updated dependencies [1482a3f]
- Updated dependencies [a574300]
- Updated dependencies [2513a52]
- Updated dependencies [fa79a0e]
- Updated dependencies [5a00dcb]
- Updated dependencies [d7bec53]
- Updated dependencies [17ed864]
- Updated dependencies [1d6f730]
- Updated dependencies [f81a4f0]
- Updated dependencies [6668dba]
- Updated dependencies [b125655]
- Updated dependencies [f962a7d]
- Updated dependencies [9996125]
- Updated dependencies [9e91762]
- Updated dependencies [4f55909]
- Updated dependencies [f4c2702]
- Updated dependencies [2df0297]
- Updated dependencies [3e08678]
- Updated dependencies [dea5df9]
- Updated dependencies [7407d65]
- Updated dependencies [318bbad]
- Updated dependencies [fc83abd]
- Updated dependencies [9a3f01e]
- Updated dependencies [178bc6d]
- Updated dependencies [58b59d7]
- Updated dependencies [efa7836]
- Updated dependencies [678ba58]
- Updated dependencies [8904184]
- Updated dependencies [e680b16]
- Updated dependencies [a805212]
- Updated dependencies [7263241]
- Updated dependencies [66e5008]
- Updated dependencies [ff45e97]
- Updated dependencies [dd039d2]
- Updated dependencies [6fed038]
- Updated dependencies [adcad97]
- Updated dependencies [77d0026]
- Updated dependencies [0a27bde]
- Updated dependencies [97b247c]
- Updated dependencies [e288833]
- Updated dependencies [ea11703]
- Updated dependencies [fa82aef]
- Updated dependencies [178a283]
- Updated dependencies [886453b]
- Updated dependencies [baa40a1]
- Updated dependencies [0280a6a]
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
- Updated dependencies [a357f0c]
- Updated dependencies [82a9c4e]
- Updated dependencies [1957b39]
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
- Updated dependencies [78523d2]
- Updated dependencies [6fd2a5d]
- Updated dependencies [525aee0]
- Updated dependencies [a20d4d9]
- Updated dependencies [06cbe76]
- Updated dependencies [40b50c2]
- Updated dependencies [f112c37]
- Updated dependencies [8048e42]
- Updated dependencies [520c34f]
- Updated dependencies [85bdad2]
- Updated dependencies [b2a44d6]
- Updated dependencies [a1d42c4]
- Updated dependencies [077cd58]
- Updated dependencies [77d0026]
- Updated dependencies [4a10672]
- Updated dependencies [ee180f6]
- Updated dependencies [c209b42]
- Updated dependencies [78433b0]
- Updated dependencies [77976e4]
- Updated dependencies [e0a9adb]
- Updated dependencies [f99a6e9]
- Updated dependencies [eda8b55]
- Updated dependencies [11de244]
- Updated dependencies [79d5ecf]
- Updated dependencies [cc11297]
- Updated dependencies [ff37699]
- Updated dependencies [6dadb41]
  - @dxos/echo@0.12.0
  - @dxos/app-framework@0.12.0
  - @dxos/app-toolkit@0.12.0
  - @dxos/assistant@0.12.0
  - @dxos/client@0.12.0
  - @dxos/plugin-space@0.12.0
  - @dxos/ui-theme@0.12.0
  - @dxos/schema@0.12.0
  - @dxos/compute@0.12.0
  - @dxos/react-ui@0.12.0
  - @dxos/react-ui-components@0.12.0
  - @dxos/effect@0.12.0
  - @dxos/react-ui-attention@0.12.0
  - @dxos/client-protocol@0.12.0
  - @dxos/echo-client@0.12.0
  - @dxos/types@0.12.0
  - @dxos/plugin-client@0.12.0
  - @dxos/ui-editor@0.12.0
  - @dxos/react-ui-form@0.12.0
  - @dxos/react-ui-editor@0.12.0
  - @dxos/react-focus@0.12.0
  - @dxos/util@0.12.0
  - @dxos/halo@0.12.0
  - @dxos/async@0.12.0
  - @dxos/log@0.12.0
  - @dxos/react-ui-menu@0.12.0
  - @dxos/plugin-graph@0.12.0
  - @dxos/react-hooks@0.12.0
  - @dxos/echo-doc@0.12.0
  - @dxos/echo-react@0.12.0
  - @dxos/react-client@0.12.0
  - @dxos/versioning@0.12.0
  - @dxos/plugin-attention@0.12.0
  - @dxos/react-ui-dnd@0.12.0
  - @dxos/ui@0.12.0
  - @dxos/halo-react@0.12.0
  - @dxos/keys@0.12.0
  - @dxos/invariant@0.12.0

## 0.11.1

### Patch Changes

- @dxos/ai@0.11.1
- @dxos/app-framework@0.11.1
- @dxos/app-toolkit@0.11.1
- @dxos/assistant@0.11.1
- @dxos/async@0.11.1
- @dxos/client@0.11.1
- @dxos/client-protocol@0.11.1
- @dxos/compute@0.11.1
- @dxos/echo@0.11.1
- @dxos/echo-client@0.11.1
- @dxos/echo-doc@0.11.1
- @dxos/echo-react@0.11.1
- @dxos/effect@0.11.1
- @dxos/halo@0.11.1
- @dxos/halo-react@0.11.1
- @dxos/invariant@0.11.1
- @dxos/keys@0.11.1
- @dxos/log@0.11.1
- @dxos/react-client@0.11.1
- @dxos/react-ui-attention@0.11.1
- @dxos/react-ui-components@0.11.1
- @dxos/react-ui-dnd@0.11.1
- @dxos/react-ui-editor@0.11.1
- @dxos/react-ui-form@0.11.1
- @dxos/react-ui-menu@0.11.1
- @dxos/react-ui-mosaic@0.11.1
- @dxos/schema@0.11.1
- @dxos/types@0.11.1
- @dxos/ui@0.11.1
- @dxos/ui-editor@0.11.1
- @dxos/util@0.11.1
- @dxos/versioning@0.11.1
- @dxos/plugin-attention@0.11.1
- @dxos/plugin-client@0.11.1
- @dxos/plugin-graph@0.11.1
- @dxos/plugin-preview@0.11.1
- @dxos/plugin-space@0.11.1

## 0.11.0

### Minor Changes

- 4e64123: Add an `order` option to `Aggregate.items({ limit, order })`: an explicit, per-group member ordering independent of any `orderBy` elsewhere in the query. Previously a preceding `orderBy` did double duty — establishing group order and silently determining which members (and in what order) landed in a following `Aggregate.items({ limit })` — so moving that `orderBy` relative to `aggregate` could silently change which items appeared. The mailbox list now uses `order` to keep each thread's preview newest-first, independent of the query's own group ordering.
- c035062: Ambient (Google-Docs-style) document review. The default document view now overlays every author's suggestions plus comments on main, with a per-user Editing/Viewing mode governed by a product-level `ReviewRenderPolicy`; the explicit branch switcher / diff selector remains as the advanced path. Also fixes a crash when adding a comment while viewing a branch (comment anchors now resolve against the editor-bound document) and prohibits inline comments on suggestion branches. `@dxos/ui-editor` gains `suggestionsOverlay` and a `readonly` option on `comments()`.
- 31fe0b8: Add an opt-in branch review workflow: comment threads are tagged with the branch under review and scoped to it, and a reviewer can accept an individual change from a branch (per-hunk cherry-pick via the `AcceptChange` collaboration operation) without merging the whole branch. Instant CRDT merge remains the default.
- 3f6ac61: Make the published `@dxos/cli` runnable, and keep React out of node and bun builds.

  `@dxos/cli@0.10.0` could not execute at all once installed from npm. Nothing marked `external` in
  the compiled binary can resolve at runtime (Bun's embedded filesystem has no `node_modules`), so the
  externals are gone and `esbuild-wasm`'s WASM is inlined; the `@dxos/node-std` shims resolve to node
  builtins, since Bun miscompiles `export * from 'node:<mod>'`; `@automerge/automerge-subduction` uses
  its self-contained `web` entry rather than the `node` one that reads a sibling file; the platform
  binary keeps its executable bit through publishing; and the pinned bun no longer leaks `--smol` into
  `process.argv`. Persistent SQLite on bun also now creates its parent directory, which any `dx`
  command needed on a machine with a stored profile but no data root.

  The binary also contained React, react-dom and the whole `react-ui` graph. `Capability.lazy`,
  `OperationHandlerSet.lazy` and `React.lazy` defer evaluation but not bundling, so plugin barrels that
  merely listed a React surface pulled it into every non-browser consumer: the plugins with a node
  variant now have node-conditioned `#capabilities`, and `plugin-sheet` a node-conditioned
  `#operations`. Headless code no longer reaches for React packages — `@effect-atom/atom` instead of
  `@effect-atom/atom-react` wherever only `Atom`/`Registry`/`Result` are used, and `@dxos/client/*`
  instead of `@dxos/react-client/*`. `@dxos/ui-editor/headless` is a new UI-free entrypoint for the
  editor helpers operation handlers need.

  Breaking:
  - `formatForDisplay` and `formatForEditing` move from `@dxos/react-ui-form` to `@dxos/schema`.
  - `renderByline` and `BylineIdentity` move from `@dxos/react-ui-transcription` to
    `@dxos/plugin-transcription`.
  - The icon list moves from `@dxos/react-ui-pickers/icons` to `@dxos/ui-types`, and that subpath is
    removed; `hues` moves from `@dxos/ui-theme` to `@dxos/ui-types` beside `ChromaticPalette`.
  - `@dxos/plugin-graph` no longer exports its React hooks from the package root — import them from
    `@dxos/plugin-graph/hooks`.
  - `@dxos/plugin-deck` and `@dxos/plugin-navtree` are browser-only: `#plugin` no longer resolves a
    `node` or `workerd` condition.

- 091ebe4: The `dx` binary no longer depends on the machine that built it: `@dxos/kv-store`'s `createLevel` moves to `@dxos/kv-store/level` so importing the package for its types no longer binds LevelDB's native addon, and Automerge's WASM is inlined rather than read from disk. `LevelDB`, `SublevelDB` and `BatchLevel` are unchanged on the main entry. Each `@dxos/cli-<platform>-<arch>` package also exposes `dx` directly, so one platform can be installed without pulling the rest.
- dd190a0: Add `@dxos/versioning` (checkpoints, draft branches, and 3-way merge for automerge-backed ECHO objects) and document revisions and branches in Markdown: named checkpoints with read-only time travel and restore, draft branches (separate Text objects anchored to a parent revision) with 3-way merge-back, a History companion panel, a Versions section in object properties, an editor banner with a branch switcher, agent operations (create-checkpoint, create-branch, merge-branch, get-history), and a `diffView` setting selecting inline, side-by-side, or gutter diff rendering.
- 4e64123: Add an uncorrelated semi-join query primitive: `Filter.in(query.project('property'))` matches objects whose property is in the set of values projected from a subquery's results (`col IN (SELECT property FROM ...)`), resolved once per reactive run and re-executed when the subquery's inputs change. The mailbox list now uses this to group whole threads — across the feed and this mailbox's space-scoped drafts — instead of only the messages that directly match the active filter, so thread counts and previews reflect the full conversation.
- 2e10525: The editor's object picker is now a combobox: the query is typed into a search input in the popover instead of into the document, opted into per trigger via `searchTriggers`. In markdown, the picker sorts objects by name and leads with a generic "Add object" that opens the create-object dialog and inserts a link to whatever it creates. Links to internal objects no longer show a raw-URI hover tooltip.
- 77fff35: Consolidate document review into `@dxos/plugin-review`. The comment threads (previously `@dxos/plugin-comments`) and the generic version/review layer (previously in `@dxos/plugin-space`) now live in one plugin under the `ReviewCapabilities` namespace: the history companion (checkpoint/branch/merge timeline), the in-memory version-selection and review-mode state, the default review-render policy, the `HistoryProvider` opt-in, and the timeline model. `plugin-space` no longer depends on `@dxos/versioning`, and `plugin-markdown` carries no review vocabulary — it exposes a neutral `EditorBindingHook` capability that `plugin-review` contributes to.
- cec59a4: plugin-comments and plugin-versioning merge into plugin-review (one review domain: threads,
  suggestions, branches, history), and plugin-markdown becomes review-agnostic: versioning/review
  behavior reaches the editor through the new `MarkdownCapabilities.EditorBindingHook` socket, and
  the `SuggestionSourcesProvider` slot is removed. Consumers referencing the old plugin packages or
  keys (`org.dxos.plugin.comments`, `org.dxos.plugin.versioning`) migrate to `@dxos/plugin-review`
  (`org.dxos.plugin.review`).
- 77fff35: Suggesting mode (Google-Docs-style authoring). In the ambient review view, switching to Suggesting binds the editor to the current user's own suggestion branch: their typing accrues there and renders as character-level tracked changes over main (`trackChanges`), while other authors' suggestions overlay against main via `suggestions({ base })` + `rebaseHunks` (so a foreign author no longer strikes your own new text). Accept/reject controls moved into a non-clipped hover popover. `@dxos/ui-editor` gains `trackChanges`, `rebaseHunks`, `computeCharHunks`, and a `base` option on `suggestions()`.
- 6e624bd: Fold the review "Suggesting" mode into the editor view-mode dropdown. `addViewMode` now accepts an optional `ViewModeItem[]` (default the three built-in modes), threaded through `EditorToolbarFeatureFlags.viewModes`; plugin-markdown establishes a `ViewModeExtension` capability that plugin-comments implements to contribute the "Suggesting" entry, and the separate toolbar branch-selector / review-mode dropdowns are removed (the History companion covers branch switching). Single-select dropdowns now render a check on the current value (with radio semantics). Also: an author-coloured change-bar gutter on lines containing suggestions, a fix for comments flashing out of the companion on submit, and a suggestion-overlay perf improvement (compute the base/document character diff once across all authors).
- 31fe0b8: Document branches now use ECHO-core branching: new branches fork the content's automerge history (same object, CRDT merge-back — no conflict markers), the editor binds branches per surface, and checkpoint viewing pins the live document to historical heads instead of swapping in a snapshot. Legacy content-copy branches remain readable and merge textually.
- 499dde4: Move the `WithProperties` test helper from `@dxos/plugin-markdown/testing` to a new `@dxos/app-toolkit/testing` subpath export.

### Patch Changes

- 3f1fc67: Document versioning: Google-Docs-style suggestion review.
  - **@dxos/ui-editor**: `suggestChanges` (inline per-change accept/reject over a proposal) plus word-level `diffHunks`; a multi-author `suggestions({ sources })` overlay and `groupHunks` grouping; the `comments` / `diff` / `suggest` review extensions are grouped under a new `review/` folder (package barrel exports unchanged).
  - **@dxos/app-framework**: `NamePopover` moved to `@dxos/app-framework/ui`, decoupled from translations via a `submitLabel` prop.
  - **@dxos/plugin-markdown**: branch/merge/checkpoint exposed as agent skill tools; a `suggest` diff-view mode; the compare/diff overlay is reconfigured through a CodeMirror `Compartment` so switching views no longer remounts the editor (rebinding automerge / losing selection). The branch banner's Compare toggle becomes a three-way `[Base | Diff | Branch]` view selector — Base shows the parent content at the anchor read-only.
  - **@dxos/plugin-space**: `NamePopover` removed from `@dxos/plugin-space/components` (relocated to `@dxos/app-framework/ui`); `VersioningState.compare` (boolean) becomes `view` (`base | diff | branch`).
  - **@dxos/types**: new `ContentBlock.Change` (a suggested edit — `before`/`after`) so a suggestion renders through the message tile.
  - **@dxos/react-ui-thread**: `Message.Tile` renders the `change` block (struck original → proposed text) with Accept/Reject via new `onAcceptChange`/`onRejectChange` thread callbacks; `CommentThread` is decoupled from `@dxos/react-client` (metadata/activity/identity injected as props).
  - **@dxos/plugin-review**: a unified review companion — comment threads and suggestion cards in one surface. `Suggestions` reactively tracks the document's active `kind:'suggestion'` branches (one bound probe per branch) and renders each grouped change as a change-block tile, routing Accept/Reject to the durable `AcceptChange`/`RejectChange` ops.
  - **@dxos/plugin-markdown**: a `SuggestEdit` operation + "Suggest edits" authoring action that find-or-creates the caller's per-author suggestion branch and edits it.

- b8c0825: Import ECHO data-access hooks (`useQuery`, `useObject`, `useType`, `usePagination`, …) directly from `@dxos/echo-react` in Composer plugins and UI packages instead of through the `@dxos/react-client/echo` re-export, decoupling pure ECHO data access from `@dxos/react-client`.
- c58ebb7: Fix "Cannot assign to read only property" when playing a game — game variants now receive the live state object instead of a frozen snapshot, so chess moves and New Game work again. Tic-Tac-Toe now ships from the community plugins repo and is no longer built here.
- b602d44: Resolve an object's database via `Obj.getDatabase(obj)` (and its space id via `db.spaceId`) instead of `getSpace(obj).db`/`.id` in plugin data-access sites, dropping the `@dxos/client`/`@dxos/react-client` dependency where the full space handle was not needed.
- 85893fe: Fix the mailbox silently dropping a compose draft, which has no thread. A draft with no `threadId` is now created as a thread of one — keyed on a fresh id — so the mailbox list's whole-thread semi-join and conversation grouping keep it. Also align the JMAP `Email` schema with RFC 8621, where `threadId` is a required, server-set property.
- 37874ce: Move contexts, hooks, constants and helpers out of React component modules into sibling modules so each component module is a react-refresh boundary. Public package APIs are unchanged; the previously exported names are re-exported from each directory barrel.
- 4bb7e3b: Chats no longer spend a `query-skills` call before every `enable-skills` — the available-skills list is already rendered into the system prompt — and project chats pre-bind the artifact-type skills, so creating the artifact you asked for costs fewer tool calls. Deleting an object now also closes planks for the objects it cascade-deletes (e.g. a project's chats), which previously stayed open pointing at removed objects.
- ac51564: Documents created from the editor's slash/link menu are now filed in the same collection as the document they were created from, instead of the space root.
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
- Updated dependencies [a77e1a2]
- Updated dependencies [a256a87]
- Updated dependencies [bce1dbc]
- Updated dependencies [a31ef40]
- Updated dependencies [eec72c5]
- Updated dependencies [ed992c2]
- Updated dependencies [ed992c2]
- Updated dependencies [a83d98a]
- Updated dependencies [fe63f19]
- Updated dependencies [a19443b]
- Updated dependencies [dd190a0]
- Updated dependencies [3f1fc67]
- Updated dependencies [6df314a]
- Updated dependencies [962c8cd]
- Updated dependencies [2048cb3]
- Updated dependencies [856c4f0]
- Updated dependencies [382d00d]
- Updated dependencies [382d00d]
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
- Updated dependencies [717edc0]
- Updated dependencies [d547045]
- Updated dependencies [6439417]
- Updated dependencies [ba7aabf]
- Updated dependencies [410a019]
- Updated dependencies [d958118]
- Updated dependencies [30ae5eb]
- Updated dependencies [6d2afe0]
- Updated dependencies [e65432c]
- Updated dependencies [f6a01e3]
- Updated dependencies [c9651f1]
- Updated dependencies [9cde1c6]
- Updated dependencies [5e7839e]
- Updated dependencies [923d5be]
- Updated dependencies [85893fe]
- Updated dependencies [9f7d5ad]
- Updated dependencies [6067460]
- Updated dependencies [717edc0]
- Updated dependencies [12fd785]
- Updated dependencies [6e4ac74]
- Updated dependencies [51aaffe]
- Updated dependencies [801b77f]
- Updated dependencies [d547045]
- Updated dependencies [bda1a02]
- Updated dependencies [59a65a8]
- Updated dependencies [832d150]
- Updated dependencies [aea1e6e]
- Updated dependencies [f10b1ce]
- Updated dependencies [f7d7735]
- Updated dependencies [717edc0]
- Updated dependencies [5f08a6a]
- Updated dependencies [37874ce]
- Updated dependencies [848ba1b]
- Updated dependencies [f15c632]
- Updated dependencies [3761762]
- Updated dependencies [c9da903]
- Updated dependencies [55bb048]
- Updated dependencies [bdf9f68]
- Updated dependencies [4bb7e3b]
- Updated dependencies [179afc6]
- Updated dependencies [4df6cf3]
- Updated dependencies [7b270f2]
- Updated dependencies [77fff35]
- Updated dependencies [6e624bd]
- Updated dependencies [686fac1]
- Updated dependencies [ed992c2]
- Updated dependencies [25272e3]
- Updated dependencies [0e3a1a9]
- Updated dependencies [96109be]
- Updated dependencies [37c17cc]
- Updated dependencies [f0ec728]
- Updated dependencies [08a3eea]
- Updated dependencies [bb63d91]
- Updated dependencies [392c700]
- Updated dependencies [20153c0]
- Updated dependencies [ed992c2]
- Updated dependencies [ed992c2]
- Updated dependencies [c58ebb7]
- Updated dependencies [a49131a]
- Updated dependencies [5585ec8]
- Updated dependencies [4f24c4e]
- Updated dependencies [ac51564]
- Updated dependencies [499dde4]
- Updated dependencies [a1c89fa]
  - @dxos/echo@0.11.0
  - @dxos/async@0.11.0
  - @dxos/schema@0.11.0
  - @dxos/react-ui@0.11.0
  - @dxos/react-ui-editor@0.11.0
  - @dxos/app-toolkit@0.11.0
  - @dxos/plugin-client@0.11.0
  - @dxos/ui-editor@0.11.0
  - @dxos/ui@0.11.0
  - @dxos/client@0.11.0
  - @dxos/echo-client@0.11.0
  - @dxos/compute@0.11.0
  - @dxos/versioning@0.11.0
  - @dxos/util@0.11.0
  - @dxos/client-protocol@0.11.0
  - @dxos/app-framework@0.11.0
  - @dxos/keys@0.11.0
  - @dxos/react-ui-form@0.11.0
  - @dxos/halo@0.11.0
  - @dxos/react-ui-components@0.11.0
  - @dxos/react-ui-attention@0.11.0
  - @dxos/types@0.11.0
  - @dxos/ui-theme@0.11.0
  - @dxos/log@0.11.0
  - @dxos/echo-react@0.11.0
  - @dxos/react-ui-mosaic@0.11.0
  - @dxos/plugin-space@0.11.0
  - @dxos/react-client@0.11.0
  - @dxos/ai@0.11.0
  - @dxos/react-ui-menu@0.11.0
  - @dxos/assistant@0.11.0
  - @dxos/echo-doc@0.11.0
  - @dxos/plugin-preview@0.11.0
  - @dxos/plugin-graph@0.11.0
  - @dxos/plugin-attention@0.11.0
  - @dxos/react-ui-dnd@0.11.0
  - @dxos/effect@0.11.0
  - @dxos/halo-react@0.11.0
  - @dxos/invariant@0.11.0
