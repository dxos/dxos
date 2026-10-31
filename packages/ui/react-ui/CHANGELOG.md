# @dxos/react-ui

## 0.17.0

### Minor Changes

- 9a3313a: Workspace switches fade between two live decks instead of running a view transition, and objects open without one, so both settle several times faster in WebKit. `Hooks.createHeightMemory` and `Hooks.useReservedHeight` let a component hold the height it last rendered at while its content reloads; plugin-stack keeps section heights in `StackCapabilities.SectionHeights`, `mermaid()` takes a `cache` of rendered diagrams, and plugin-deck's `ShownDeckState` provides the deck state a non-live deck renders. CodeMirror themes are built once instead of per editor. `Carousel` mounts a slide's media only on its page (images on neighbouring slides too), and `Carousel.Root` no longer accepts `autoSize`, since a slide without its media would size to nothing.
- 9d66bcd: Collections share one model for the current item, selection and arrow movement.

  - **Current** is the item with keyboard focus, drawn only by the focus ring, whether it was reached by a click or the arrow keys. `Focus.Item` no longer writes `aria-current` on focus; `aria-current` is the caller's "you are here" (`current` prop).
  - **Selected** is `aria-selected`, drawn by one shared neutral edge in `--dx-selected-color` (`.dx-focus-item[aria-selected='true']`, and `Card` `selected`), so a selection that has lost focus never reads as focus. `Focus.Item` takes `selected`; a selectable item is an `option` unless it names its own role. When an item is both, the focus ring is drawn.
  - **One selection API.** Every collection takes `itemProps(id)`, a `Focus.ItemBinding` (`aria-selected`, `onClick`, `onFocus`, and `onActivate` for click or Enter), as `useListSelection`'s `bind(id).rowProps` gives it; `Focus.bindItem` maps a binding onto an element. `Masonry.Viewport`, `Mosaic.Container` and `Board.Root` take it, replacing masonry's `selectedIds`/`onSelect` and mosaic's `selectedIds`/`onSelectionChange` and the context's `setSelected`. `Mosaic.Tile` and `CardTile.Root` take a `binding`, which a stack passes each tile. A collection whose items carry `aria-selected` is a `listbox` of `option`s. `useListSelection` follows focus anywhere in the item's arrow-key group, so a board's columns select as one collection.
  - **Masonry** tiles are `Focus.Item`s with no ring of their own, and no longer wrap their cards in a second `Focus.Item`.
  - **Arrow movement by position**, as tabster's grid mode: `useFocusGroup`'s `grid` axis moves to the item on screen in the arrow's direction (`grid-linear` for up and down); both previously stepped in DOM order. A new `itemSelector` names targets at any depth, and `findNearest` is exported. `Focus.Group` takes `orientation='grid' | 'grid-linear'` and `itemSelector`. `Board.Root` takes `navigation='grid'` to move between cards across columns.
  - A toolbar that starts or ends with a `Layout.Block` no longer adds edge padding, so a Board column without a drag handle aligns its title as one with a handle does.
  - Feature maps:
    - `FeatureCard` is a composite (`Root`, `Provider`, header parts and section parts) that each view composes.
    - It takes two generic handlers, `onChange(feature, changes)` and `onOpen(target)`.
    - Edit is in the card's menu.
    - Long lists scroll inside the card.
    - Kanban and masonry cards show the focus ring on click and follow the arrow keys by position, and both select the focused card, marking what it needs and fading the rest; Escape clears it.
    - The cards view filters by text and status.
    - Removing a feature from a project now takes its card off the project's views.

- 17a9e75: `Listbox.Root` takes `tileWidth: { min, max }`: items lay out as tiles between those widths, as many columns as fit at `min`, measured before the first paint and reflowing as the container resizes instead of stretching to a debounced column count; the arrow keys move by the columns on screen. The presenter's slide grid uses it, with a small/large toggle and captions from each slide's title or first heading; presenting scales the slide in the frame its container changes and fades in fullscreen once its size settles, and the pager follows the light/dark theme. The assistant's agent picker shows each model's vendor logo.
- 0166448: Presentations render slides written in a Slidev markdown subset (layouts, click steps, video backgrounds, embedded object surfaces) and print the whole deck, one slide per page; reveal.js is removed. A Presentation's article is a grid of slide thumbnails that can be dragged to reorder and double-clicked to present. A deck takes a theme (`default`, `light`, `dark`, `serif`) with color overrides and a named text and code font, whose web fonts load only when used. Slides open in an editor with a slide toolbar and a live preview, below it or in the companion, kept in step with the cursor both ways.

  `Listbox` takes `tiles` (a column count) to lay items out as a grid of cards with two-dimensional arrow keys; a list's current row is now marked in a neutral color and its selection in the focus color, and draggable rows can be reordered in a grid (`useReorder` with `axis: 'horizontal'`). `SyntaxHighlighter` takes a `themeMode` prop and `react-ui-syntax-highlighter` exports `renderRows`.

- f86f10e: Presenter shows speaker notes while presenting (subtitles or a separate window, chosen in its settings), gives each slide an optional desired length, and adds extension points for other plugins: a toolbar slot, an overlay slot and a presentation event handler. Studio renders `audio/*` variants. Adds the private `plugin-recorder`, which records a presentation's voice-over. react-ui adds a `SystemButton.Check` toggle preset (green while checked).
- 7da5d17: Comment threads now keep their messages in a feed the thread owns (`Thread` 0.3.0: `feed` replaces `messages`; a migration moves existing threads), and the assistant answers them: plugin-assistant contributes `AppCapabilities.CommentAgentRunner`, which runs each turn in a hidden chat on the thread's feed with the commented object bound, so comments on a diagram, a sheet or a document get that type's skills. While a turn runs the thread shows a pending reply, an agent edit keeps the comment anchored to the edited text, and `@`-mentions complete and render as pills in the mentioned actor's colour. plugin-review's own LLM runner is removed, `Chat.feed` can run on a feed another object owns, and `CreateChat` accepts an existing `feed`. The "Comment agent mode" setting (`off` | `auto` | `mention`, default `mention`) moves from plugin-markdown to plugin-review, applies to every subject, and appears under Plugin Settings. The plugin registry's search filter also matches a plugin's description. `Typography.Timestamp` gains `variant='relative'` (relative within two days, then the date), with `formatRelative` and `useRelativeTime`; comment threads, assistant messages, notifications and pull requests now share it.
- d00cc85: Typing quickly into a combobox or a controlled `Editor.View` no longer drops characters when the page renders slowly, and Enter picks a combobox's first match even when pressed in the same frame as the typing. A chat feed's jump to the latest message now arrives however long the feed sat idle, and scrolling away while an answer streams is no longer undone. Table cells for any type with a GeoPoint field open their editor instead of an error, and a new feature card's name field takes focus once the board shows it. `useMasonryTileRevealed`, `pin` on `useFollow`'s handle, and the `gate` option on scripted model turns are new.
- e67aa80: `ColorPicker.HueGrid` is a hue-only variant of the color picker whose value is a theme hue's name, and `HuePicker` now opens it in a popover, so every hue fits the grid and the reset button no longer covers a swatch; `HuePicker`'s `onReset` takes no event. `NumberInput` gains `stepper='start'` (the pair before the input), `stepper='split'` (decrement before the input, increment after), `stepperOnHover` (the stepper sits opposite the number and shows only while the row is hovered or focused), `align='end'` for right-aligned figures, and `slider`, a button that opens a slider over `min`..`max`. The space's Database section hides a type whose plugin is disabled (its objects stay reachable), and an object whose plugin is disabled offers a "Find plugin" button that opens the plugin registry filtered by its type. The dev-server variant of the "Composer Plugin" project template has its own id and label, so it no longer appears as a duplicate of plugin-projects' template.

### Patch Changes

- df16fba: Popups (menus, selects, comboboxes, popovers) no longer draw a focus ring; the highlighted item shows where focus is. In the chat prompt, the placeholder is shortened to "/ for skills, @ for content", "Add an object" is renamed "Add object", and switching between the tasks and context drawers closes the open drawer before the other opens. The search and add-to-collection dialogs keep their input's inner padding. The prompt's command completions render as a react-ui-list Listbox in a popover above the editor, at most 8 rows tall, whose arrow keys stop at the first and last command instead of wrapping; Escape closes it and leaves focus in the editor. An editor no longer moves focus to its host on an Escape CodeMirror already acted on.

  A polyline locked while its vertices are being edited loses its vertex handles, Delete no longer removes a vertex from it, and a vertex drag the lock lands in the middle of neither previews nor commits a change.

- e343467: A floating panel stays opaque while it is dragged; the devtools SDK Explorer shows a connecting state and scrolls its tool list; the MESH signal panel no longer crashes before signal status arrives; the ECHO Objects tree drops the `$.content` role labels and shows a relation's glyph at the end of its row; and the ECHO Queries list supports arrow-key navigation with compact query labels.
- 034e231: Kanban cards render in card views that request only `cardContent`: the kanban, map, assistant and devtools surface modules now declare every role their surfaces bind. `MediaPlayer` embeds drop the `allow-presentation` sandbox flag on engines that don't support it, so WebKit no longer logs an error per embed. The "large number of dispose callbacks" warning reports six stack frames, enough to reach the code past a helper such as `Event.on`.
- 0590c11: New Demo space template: sixteen chess games at every stage, a world map of every Cloudflare data centre with a globe tour from Los Angeles to Sydney, a voxel creeper, a voxel town, and a spacetime scene of three race cars and a fire truck. `@dxos/plugin-spacetime` is now public, with a `SpacetimePresets` entry that builds a preset model (fire truck, race car, taxi) as a stored mesh. A game now has an optional `description`, which chess keeps set to the current FEN so tables and cards show each position; chess cards draw their board full width again, and the move list drops its focus ring. A map's `coordinates` are its globe tour route; the globe gets a light street-map palette, small dark-blue markers, a red tour route and a margin at rest, and flat-map pins shrink to 60%. The DXOS Architecture template's metrics sheet gains a pie of the busiest plugins' PR share. Refs to the same object from different clients in one page no longer share a cached atom, so each client resolves a ref through its own database (previously every client's editor bound to whichever client loaded the object first). Replicated comments now show up on every peer: the editor retries an anchor whose cursor cites edits not yet received, and comment sync re-reads anchors when a thread arrives after its anchor. Many clients editing one document replicate much faster: sync no longer rebuilds Automerge changes on every message to check a peer's initial heads (patched `@automerge/automerge-repo`), and a query from objects to typed relations on them (`select(...).targetOf(Type)`, as comment threads use) re-runs only when those objects, relations of that type, or the relations' endpoints change, rather than on every write in the space. A masonry grid now has the same gap on all four sides: inside a padded `Masonry.Content` it adds the gap above and below as well as at the sides, and a non-scrolling grid (`scroll={false}`) adds none, leaving the perimeter to its host. Padding of `p-3` is now the equivalent `p-trim-md` token. A toolbar now insets both ends by the same gap, whether the edge item is a labelled control or an icon-only button, plugin-theme registers the menu translations so the overflow button reads "More", and a project's pipeline toggle reads "Hide pipeline" while the chart is shown.
- 4fe25ee: Upgrade to React 19.3. The `react` and `react-dom` peer ranges are now `~19.3.1`.
- ca2a4a8: A `Listbox` in a settings form row now spans the row below its description; it previously collapsed to zero width and showed no items.
- Updated dependencies [1a0fff1]
- Updated dependencies [e50d1e5]
  - @dxos/ui-types@0.17.0
  - @dxos/async@0.17.0
  - @dxos/effect@0.17.0
  - @dxos/util@0.17.0
  - @dxos/lit-ui@0.17.0
  - @dxos/ui-theme@0.17.0
  - @dxos/react-error-boundary@0.17.0
  - @dxos/react-hooks@0.17.0
  - @dxos/log@0.17.0
  - @dxos/react-focus@0.17.0
  - @dxos/i18n@0.17.0
  - @dxos/invariant@0.17.0

## 0.16.0

### Patch Changes

- dc7785a: Composer UI polish: board and calendar controls show translated labels; board cards truncate their titles and draw a light border; card posters cap at 200px; person cards show a 120px headshot with initials in the header; kanbans gain an optional description, which their card shows under the title; and stacked plot bars are supported. A virtual stack re-measures its tiles when a smooth scroll stops, so mailbox tiles no longer overlap; the companion pane stays open when switching planks; a flat plank's breadcrumb title keeps its size and place; L0 space avatars get a stable colour from their id; canvas inspectors float by default; and the calendar article gets the mailbox's filter box with saved views (`QueryEditor` takes `commandHint={false}` to drop its "Press '#' for commands" hint). Agents can enable the Drawing skill themselves.
- 2f76f26: A tab, labelled button or other filled control at either end of a `Toolbar` now starts one gap in from the edge, in line with a list's icon column; plank and complementary headers start their leading control 4px in and the companion header 8px in; and a tab that shows its label only when selected keeps its icon in place as selection changes.
- @dxos/async@0.16.0
  - @dxos/effect@0.16.0
  - @dxos/i18n@0.16.0
  - @dxos/invariant@0.16.0
  - @dxos/log@0.16.0
  - @dxos/util@0.16.0
  - @dxos/lit-ui@0.16.0
  - @dxos/react-error-boundary@0.16.0
  - @dxos/react-focus@0.16.0
  - @dxos/react-hooks@0.16.0
  - @dxos/ui-theme@0.16.0
  - @dxos/ui-types@0.16.0

## 0.15.0

### Minor Changes

- 0d81167: Hand-built agent panels follow the form's layout, and the entity browser slots into its host.

  - `@dxos/react-ui-components`: **Breaking:** `Section` is removed; build a labelled group with react-ui's `Fieldset.Root` and `Fieldset.Legend` (the form's label row) instead.
  - `@dxos/plugin-agent`: the Activity panel lays out its groups in the form's frame (`Form.Viewport`, `Fieldset`). `AgentKnowledge.Browser` (`EntityBrowser`) is composable, its horizontal scroll frame the root, so a host's `Panel.Body asChild` slots onto it instead of nesting a second panel. Predicate cards title each predicate in kebab case, as the entity cards key it. The email channel's settings are a panel whose header toolbar reads "Email" with one connect/disconnect toggle, as Activity's, and the form scrolls beneath it.
  - `@dxos/plugin-discord`: the Discord setup panel uses the same form frame and `Fieldset` groups. Its toolbar links to the hub console's Discord page for the EDGE environment the client is configured with.
  - `@dxos/plugin-client`: recovery credentials show when each was issued to the minute on a 24-hour clock, and a revoked one is marked by its strikethrough alone.
  - `@dxos/react-ui`: `Layout.Columns` lays out a horizontal run of columns sized to whole shares of the space (as many as fit at a minimum width, each an exact fraction), scrolling a column at a time and following the newest. `Status.Empty` reads at the label's size (`text-sm` by default), so every empty state is the same secondary text. Overlay scroll thumbs sit flush with the ends of their track, as they already did with its side. A tag in a start-aligned card row centres on the first line, as text does.

- 1b33a84: `Listbox.Content` and `OrderedList.Content` no longer scroll themselves: wrap them in the new `Listbox.Viewport` / `OrderedList.Viewport` for a list that owns its scrolling, and leave them bare inside a host that scrolls. Breaking: the `scroll` prop is removed (drop `scroll={false}`; wrap lists that relied on the default in a `Viewport`). `Listbox.Root` gains `onHighlightChange`, rows laid out with Root `columns` centre their parts, card icons default one size step larger, and the GitHub pull request's checks list is compact, navigable with the arrow keys, and scrolls with its tab.
- 25af912: Shell dialog errors, canvas inspectors and editing controls, and conductor circuits that run.

  - HALO and join dialog steps (identity input, profile form, reset confirmation) show their validation message again: the field is marked invalid whenever a message is present, which the field's error text requires before it renders.
  - **Breaking (`@dxos/react-ui-canvas`):** the canvas's properties, layers and about panels are now _inspectors_. `SceneView.Root`'s `panels` prop is renamed `inspectors` and `PanelMode` is renamed `InspectorMode`. `onInspectorsChange` adds a close button to the dock's toolbar (it floats the inspectors) and a dock / float item to each inspector's menu; `Properties`, `LayersPanel` and `About` take `onDockedChange` for it, and `useInspector` / `InspectorDef` let a host add its own inspector. Composer's "Dock panels" / "Float panels" drawing menu item is removed.
  - `SceneView.Root` takes `onReadonlyChange`; given it, the palette's tools group gets a lock toggle below Pan, and going read-only drops a drawing tool back to select.
  - The smart line leads the palette's link tools and is the link a port drag creates until another link tool is picked. The bottom camera and action bars use full-size icons, and the centred action bar keeps clear of the camera bar.
  - Conductor circuits save and run: a board's layout elements are open records, so ECHO accepts edits (a dropped shape threw `Unknown property`); the circuit resolves every service its graph needs, so a switch lights its beacon; and the AND, OR and NOT gates draw in node coordinates, meeting their ports.
  - The space-level operation handler provider is no longer pruned at startup: its layer spec required the `AtomRegistry` capability instead of the layer service, which also dropped every space spec built on it.

- 60ef4ec: Popover, tooltip, menu and hover-card arrows show whole on every side: a popup is now its own stacking context, so its arrow paints over the popup's surface and ring instead of beneath them. A hover preview (a reference chip's card) stays open while the pointer is over it, so its menu can be reached: `Popover.Content` marks itself as popover content again. The shell's HALO dialogs (joining a space or identity, the identity and space panels, invitations, reset) are rebuilt on the react-ui Dialog's columns: each step is a `Dialog.Body` of content in the dialog's content column and a `Dialog.Footer` of actions on one line, so title, content and actions share one edge; the identity chooser is a keyboard-navigable `Listbox` of full-width, equal-height options. `Dialog.Body` takes a `gap` and an `align='center'`, and stands its content a gap clear of the Header and Footer; a dialog sizes to its active step rather than its tallest one. `PinInput` takes a `size`, and a `Container` takes an `xl` gap. Breaking: `@dxos/shell/react` no longer exports `ActionBar`, `Action`, `CloseButton`, `Heading`, `InputLabel`, `Label`, `TextInput` or `stepStyles`; use the react-ui Dialog, Field and Input primitives. A list row's focus ring paints over its parts (an overlay above the row, which is its own stacking context), so it encloses the whole row rather than hiding under a leading tile or trailing tag. The shell's device, member, invitation and contact lists share one `Listbox` row composition (leading icon or avatar, text, trailing controls) with arrow-key navigation; breaking: `DeviceList` takes `ShellDevice[]` (its heading and add button move to the identity panel), `IdentityListItem` drops `onClick` (the list picks via `onSelect`), and `InvitationListProps` drops `className`, and the unreachable `InvitationAccepted` step is removed. A space invitation card sits on its host card's columns, with a smaller avatar. `Syntax.Content` is unpadded, so the panel hosting it owns the frame. Canvas shortcut labels show a shifted digit as its key cap (`⇧0`, not `⇧)`).

### Patch Changes

- 3d151fc: In `@dxos/react-ui-canvas`, the view has a fit mode: Fit frames the scene and keeps it framed, refitting once a resize settles and on opening another scene, until the viewer pans or zooms. `SceneView.Root` takes `initialDisplay` / `onDisplayChange` (`SceneDisplay`: snap, guides, fit) so a host can restore and persist those toggles, and a view opens in fit mode unless restored otherwise. A read-only view floats its panels. A link caption on a horizontal run is shortened with an ellipsis to fit between the run's ends, its full text as a tooltip. The camera readout shows only the zoom.

  In `@dxos/plugin-canvas`, the plugin moves to the `beta` tier. A canvas's view is the viewer's own, kept in one view-state object per canvas: read-only, floating panels, grid, guides, fit and camera; the `dockPanels` setting is gone. The drawing menu now lists Read only and Dock/Float panels. A drawing's canvas record may set `readonly` as the default for viewers who have not chosen. A canvas in the section role (a document's embed) is read-only, shows the drawing without its palette or panels, and takes a 3:2 height. The DXOS Architecture space template seeds its drawings, read-only by default, from diagrams laid out ahead of time (`compiled.json`, kept current by a test), plus Composer, DXOS and EDGE documents that link and embed them.

  In `@dxos/plugin-space`, the create-space dialog closes as soon as it is submitted (a failed create is a toast) and its template list aligns with its fields; the collection article is a panel with a Filter… toolbar over a scrolling column of objects, their icons in the hue's text colour; the delete-space dialog's actions sit in `Dialog.Footer`.

  In `@dxos/react-ui`, a field in a toolbar no longer overflows it, and a dialog's action bar has the dialog gutter above as well as below.

  In `@dxos/plugin-registry`, the load-plugin dialog's action sits in `Dialog.Footer`.

- ab27b41: Conductor circuits, the canvas, markdown links and mermaid diagrams.

  - **Circuits:** deleting a linked node no longer crashes the plank, and a circuit left half-deleted by that crash opens again (a shape whose compute node is gone shows its type as a placeholder and can still be deleted). Adding a node no longer logs `No compute function for node type: switch` and resets the switches: the circuit keeps one graph controller instead of building one per edit.
  - **Circuit look:** ports scale with the zoom (never under 3 screen px); a logic gate's body is three minor grid units tall with 2px lines; the beacon is round, a dim sun when off and a yellow duotone sun when on. A node definition can ask for an elliptical frame (`NodeDef.ellipse`).
  - **Palette:** the link types share one flyout, whose face has no tooltip.
  - **Markdown links:** an external link's arrow icon opens the link in a new tab (web URLs only); the hover tooltip that only repeated the URL is gone.
  - **Mermaid:** a diagram renders as a block widget over its fenced source, so one that ends a document shows (it was hidden with the source) and the blank lines around it stay; the corner label skips leading `%%` comments.

- 71fc002: `Slider` no longer fades while its thumb is dragged, and its track now spans the full width so it lines up with the label (thumbs are kept inside the track instead of an inset margin).
- 55bdf55: The agent's fact graph can be browsed as entity cards, with Turtle and TriG highlighted in the editor.

  - `@dxos/plugin-agent`: `EntityCard` shows one entity of the fact graph (its type, name, properties, and the properties pointing at it, with chips coloured by type), and `EntityBrowser` explores the graph as Finder-style columns, each with a filter, a close action and arrow-key navigation.
  - `@dxos/pipeline-rdf`: `Predicate.label` writes a predicate or an inverse in one display form, lowercase kebab-case (`works-at`, `known-by`).
  - `@dxos/ui-editor`: `turtle()` highlights RDF 1.1 Turtle and TriG (prefixes, IRIs, prefixed names, blank nodes, literals with language tags and datatypes, graph blocks).
  - `@dxos/react-ui`: a chosen card in a keyboard stack (a `Focus.Item`) shows the current surface rather than the accent border, so the focus ring is the only edge it draws.

- 8190cc5: Tags take half the gap as inline padding and no vertical inset, and task-list tags align with the title and space apart. The deck companion no longer opens beside planks that have nothing related (plugin registry, space and plugin settings); it returns when you go back to a document.
- Updated dependencies [1e9c017]
  - @dxos/async@0.15.0
  - @dxos/effect@0.15.0
  - @dxos/react-error-boundary@0.15.0
  - @dxos/react-hooks@0.15.0
  - @dxos/util@0.15.0
  - @dxos/lit-ui@0.15.0
  - @dxos/i18n@0.15.0
  - @dxos/invariant@0.15.0
  - @dxos/log@0.15.0
  - @dxos/react-focus@0.15.0
  - @dxos/ui-theme@0.15.0
  - @dxos/ui-types@0.15.0

## 0.14.0

### Patch Changes

- fd09131: `SceneView` docks its properties and layers panels by default: a column beside the canvas (which narrows rather than sitting under them) holding an accordion with one section per panel, any number open, the column scrolling them together. `SceneView.Root` takes `panels` (`PanelMode`: `'docked'` | `'floating'`) to float them back over the canvas instead; `Properties` and `LayersPanel` take `docked`. The layers toolbar's delete and merge actions move into a menu at its end. A new `SceneView.About` adds a dock-only section below the layers with the scene's object counts (`About` is the panel itself). In Composer, a canvas drawing's menu offers "Dock panels" / "Float panels", stored as the canvas setting `dockPanels`.

  In `@dxos/react-ui`, `Toolbar` adds no gap or inline padding of its own (its items carry their own spacing, and a `ToggleGroup` in a toolbar drops its gap to match), and an `Accordion` item's icon and caret sit in `Block`s rather than custom padding, and list rows in a container with no gutter lose their rounded corners. In `@dxos/react-ui-form`, a `Form.Viewport` without `scroll` pads its block axis as the scrolling one does, so a form in a host that scrolls it still ends a gutter in.

- 508be04: The scene shape is now a frame. Breaking: the built-in node type `scene` is renamed `frame` (palette name "Frame", shortcut F), with `PortalNode` → `FrameNode`, `isPortalNode` → `isFrameNode` and `PortalNodeView` → `FrameNodeView`; the node's `scene` field (its child scene id) is unchanged, and drawings saved with `type: 'scene'` are not migrated. A node type may define `hostOpen`, the host's own way to open a node of it: opening (double-click, Enter, the open control) calls it instead of drilling in, and auto-drill passes such a node by. A node type may also define `toolbar`, controls drawn above the node, flush with its right edge and at screen size, shown while the node is hovered or selected. The canvas clips rather than hides its overflow, so focusing an editor in a node no longer scrolls the canvas out from under the camera. A frame always draws its border, and one the host opens itself is never faded as the scene being zoomed into. A node's embedded content (marked `data-scene-overlay`) is live only while the node is active (`SceneViewAtoms.active`, `NodeViewProps.active`): a click on the node activates it, and selecting anything else or Escape deactivates it. Inactive, a press anywhere moves the node; active, a press on the content starts no move (so its controls receive their clicks), a double-click there does not open the node, and the wheel is the content's where it has something to scroll. Presses inside a portal the content opens (a menu) no longer reach the node.

  In `@dxos/plugin-canvas`, a frame holds either its own nested scene or a referenced ECHO object: `CanvasSceneNode.drawing` is replaced by `CanvasFrameNode.object` (any object, picked in the properties panel) and `role` (`card`, `section` or `article`; unset is a card). A canvas drawing is embedded as a scene, as linked drawings were; any other object renders as its surface of that role, with a floating toolbar whose button opens the object in the app. Selecting the frame, or focusing within it, gives the object's surface attention, so its own toolbar acts. The object picker lists only user objects (those the navtree shows), not system objects such as space properties or canvases.

  In `@dxos/react-ui-form`, the object picker's popup is as wide as its field rather than growing to its longest option.

  In `@dxos/react-ui`, a `Card.Root` with `border={false}` also drops its corner radius, as its prop always described, so a card framed by its host shows no rounding of its own.

- 347546a: Scenes have layers. `Scene.layers` holds ordered `Layer`s (a scene that names none has one, `DEFAULT_LAYER`), and every node and link is on one (`layer`); created, pasted and fixture-built elements name theirs, and adding a layer first pins elements that name none to the layer they are drawn on (`pinLayers`), so a new bottom layer never takes them. `@dxos/plugin-canvas` names the layers of a drawing saved before layers when it loads. Elements paint by layer, then by their own order, and a hidden layer is neither drawn nor hit. `SceneView.Layers` (`LayersPanel`) selects several layers at once, adds (at the end of the list), deletes, merges the selected layers into the top-most of them, shows or hides, reorders and renames them in place; new shapes go on the top-most selected layer, and the properties panel picks an element's layer. New intents `layer` and `removeLayer` carry the edits, so each is one undo step. `CellGrid` (with `createCellGridAtoms`, `toggleCell`, `ToggleMode` and its headers) is no longer exported from `@dxos/react-ui-canvas`: it moved into `@dxos/plugin-sequencer`, its only user.

  In `@dxos/react-ui`, `Editable`'s pencil opens the field with one click whatever the activation gesture, the field shows a save button (a green check) while editing, and inside a list row the preview takes the row's hover and its presses, so the list keeps its arrow keys. `Listbox.Root` takes `selectionMode='extended'` (Cmd/Ctrl- or Shift-click adds to the selection), and `Listbox.Content` takes `padBlock` to pad the list above and below by its gutter. In `@dxos/react-ui-list`, `OrderedList.Root` takes `multiple`, so `value` and `onValueChange` carry an array of ids.

- Updated dependencies [1819960]
- Updated dependencies [b07f49f]
  - @dxos/effect@0.14.0
  - @dxos/ui-theme@0.14.0
  - @dxos/async@0.14.0
  - @dxos/i18n@0.14.0
  - @dxos/invariant@0.14.0
  - @dxos/log@0.14.0
  - @dxos/util@0.14.0
  - @dxos/lit-ui@0.14.0
  - @dxos/react-error-boundary@0.14.0
  - @dxos/react-focus@0.14.0
  - @dxos/react-hooks@0.14.0
  - @dxos/ui-types@0.14.0

## 0.13.0

### Minor Changes

- 321c99f: Every `@dxos/react-ui` component family is now a namespace module with its own subpath. A compound family exports its parts: `import * as Dialog from '@dxos/react-ui/Dialog'` gives `Dialog.Root`, `Dialog.Content` and `Dialog.RootProps`. A single component keeps its own names: `<Icon.Icon>`, `Icon.IconProps`. Related components share a namespace: `Button` (`Button.Root`, `Button.Toggle`, `Button.Menu`, `Button.Group`), `Input` (`Input.Root`, `Input.Textarea`, `Input.Number`, `Input.Password`, `Input.Pin`, `Input.Date`, `Input.Slider`, `Input.Frame`, `Input.Checkbox`, `Input.Switch`), `Layout` (`Layout.Flex`, `Layout.Grid`, `Layout.Container`, `Layout.Block`, `Layout.Separator`), `Status` (`Status.Empty`, `Status.Skeleton`, `Status.Deferred`, `Status.Error`, `Status.Progress`, `Status.Steps`), `Typography` (`Typography.Text`, `Typography.Link`, `Typography.Timestamp`, `Typography.Crawl`) and `Media` (`Media.Image`, `Media.Player`). `ThemeProvider` is now `Theme.Provider`. General hooks live in `@dxos/react-ui/Hooks` (`Hooks.useTranslation`) and composition helpers in `@dxos/react-ui/Util`. The root exports namespaces only, so `import { Dialog } from '@dxos/react-ui'` still works, but flat names such as `ButtonProps` and `useTranslation` are gone, and so are the `@dxos/ui-types` re-exports (import those from `@dxos/ui-types`).

  `AttentionGlyph` moves from `@dxos/react-ui` to `@dxos/react-ui-attention`.

### Patch Changes

- d2a6aad: `AlertDialog` closes only through its own controls, and `AlertDialog.Root` no longer takes `closeOnInteractOutside` or `closeOnEscape`.
- 7d222fc: - **Inbox conversation:** each message tile is a grid card, so the sender's avatar and the detail rows' icons (recipients, attachments, tags) share one start rail and every text starts at the same edge; the disclosure caret sits after the sender's name and the open/close animates.
  - **Card.Section:** merges a `className` from an `asChild` parent, so `Collapsible.Content asChild` keeps its height animation; a collapsible on a section keeps the section's subgrid.
  - **Card.Row:** `align='start'` centres the leading icon and trailing cell on the row's first line, for a title over a snippet.
- 1b37aa8: The `Loading` testing component no longer crashes under a production React build, where `captureOwnerStack` is not exported.
- 49731e1: Long lists of rows with differing heights can now be windowed: `useVirtualRows`, `Listbox` and `Tree` accept `virtual='measured'`, which mounts only the rows in view and measures each as it mounts. The task list uses it, so a project with hundreds of tasks no longer renders every row, and checking a task re-renders only the rows in view.

  `Obj.getSnapshot` no longer throws and catches two errors for every non-relation object it snapshots.

- Updated dependencies [cb1e218]
- Updated dependencies [e99ee70]
- Updated dependencies [1894fc1]
  - @dxos/util@0.13.0
  - @dxos/async@0.13.0
  - @dxos/effect@0.13.0
  - @dxos/log@0.13.0
  - @dxos/react-focus@0.13.0
  - @dxos/react-hooks@0.13.0
  - @dxos/react-error-boundary@0.13.0
  - @dxos/lit-ui@0.13.0
  - @dxos/i18n@0.13.0
  - @dxos/invariant@0.13.0
  - @dxos/ui-theme@0.13.0
  - @dxos/ui-types@0.13.0

## 0.12.0

### Minor Changes

- 96f94c2: `Carousel`, `Editable`, `Splitter` and `Stepper` are now built on `@ark-ui/react`'s zag state machines rather than hand-written interaction and a11y logic. The namespaced APIs (`Carousel.Root`, `Editable.Preview`, `Splitter.Panel`, …) and their props are unchanged apart from the two noted below, and every part still takes `classNames`.

  Breaking: `Carousel.Root` no longer takes `transition` — the machine has one way to move between slides, so a carousel that previously hard-swapped now slides — and `useCarousel` is removed. `Editable`'s `useEditableContext` is now the machine's own context hook and takes no consumer name; `useEditable` keeps its options and return shape, with `onBlur` dropped (an interaction outside the field is the machine's to handle) and `activation` widened to also accept `'focus'` and `'none'`.

  `Escape` on an `Editable` that was empty when it opened now discards the typed text rather than keeping it, and a field held open through `editing` commits at all — a controlled editing state made the machine treat a submit as a request to its host, so a pane editor driven that way wrote nothing.

  `Stepper` no longer eases its progress line back to nothing when a run is reset or wound back; only the line leaving the stage in flight animates, and everything else lands at once. A run that fails now draws every stage it started in the error hue rather than only the stage it stopped on.

  An article surface is told which graph node it renders (`nodeId`), separate from which node holds attention (`attendableId`). The two are the same for a primary plank and differ for a companion, which shares its host's attention — so a surface reading its own contributed actions from `attendableId` was rendering the host's toolbar. Actions can also say which surface they suit: `disposition` already accepted an array, and `'prompt'` joins `'toolbar'` for actions that belong beside a text input rather than on an object.

  An editor's placeholder no longer shows behind streamed pending text, which is a decoration rather than document content.

- 9714c75: `@dxos/brand/channels` names the prerelease channels (`dev`, `preview`, `staging`) and the colour each one paints the mark, and `channelMarkFilter` turns that colour into a CSS filter over the released artwork. The boot loader applies that filter to the mark, the ring and its head together, so a channel build no longer ships its own copy of the mark and the ring agrees with it; the composer app's icon variants are generated from the same definitions. The brand `Icons` story shows the channels in a row.

  The boot loader's activation row is a flex row translated as one group: a plugin's icon is appended at the end and fades in, and the row slides half a slot to stay centred on an eased count driven by the same frame loop as the ring, so arrivals in quick succession keep the row moving rather than stopping it between each.

  Breaking: `react-ui`'s `Stepper` is renamed `Steps`, after the Ark machine it sits on, as the rest of the family is named: `StepsProps`, `StepsStyleProps`, `stepsTheme` and the `steps.*` theme keys follow. The `Step`, `StepOptions`, `stepCount` and `stepAt` helpers keep their names.

- bd6ba8e: `Carousel` no longer auto-advances for a reader who has set `prefers-reduced-motion`, or under the
  new `VITE_DX_DISABLE_ANIMATIONS=true`, which turns off animation that runs without a user gesture.
  An unattended carousel — the tour's welcome panel advances every 10s — had been making every frame
  of an agent-driven recording differ from the last, defeating the still-frame culling those
  recordings depend on. The `useReducedMotion` hook behind it is now exported from the package.
- d194929: Add `Collapsible`, a section that folds under its own heading — it pairs the trigger to the section for assistive technology, animates the section's height, and can mount it only while open. A stack of them under one caller-owned expansion set is an accordion, which is how a mail conversation now renders its messages. Dialogs focus the control marked `data-dx-autofocus` on open, so one offering a Cancel action no longer commits on a reflexive Enter, and a dialog body scrolls with its header and actions pinned. Fixes a popover crash on any surface whose theme context carries no safe-area padding, a task list description running under the trailing controls, and an outliner menu button that stayed put when an ancestor scrolled.
- 557e243: `Column.Root` (and `Card.Root`) gain a `gap` prop (`sm` | `md` | `lg`) controlling the vertical gap between all rows of the grid. The card's default spacing is unchanged (`sm` equals the previous `gap-1`).
- d770fe7: Switching workspaces in the deck now runs as a view transition where the browser supports `document.startViewTransition`: the content area and the navigation sidebar crossfade to the new workspace, and a sidebar that expands with the switch morphs from its rail to its open box instead of sliding underneath the fade. Readers who prefer reduced motion see the switch as before.
- ab56cfe: Devtools panels are article containers (`*Article`, exported from `containers/panels`) and the stats panel is a stack of `StatCard` cards, each contributed as a surface on `AppSurface.DevtoolsOverview`; the `Panel` accordion and `*Panel` exports are gone, and the duplicate `logs` deck companion is removed in favour of the debug panel's Logs page.

  `Button` gains a `tag` variant with a `hue` (the `dx-tag` look on a button), `Field.Switch` takes a `density` and shrinks at `sm`, and `Card.Root`'s `density` now applies to its contents. `Surface.getMounted()` lists the surfaces currently mounted and `Surface.useProfilerSnapshot()` reads the profiler's cumulative per-surface stats without subscribing.

  `JsonHighlighter` and `SyntaxHighlighter` scroll inside the family's themed `ScrollArea` (`scroll` picks the axes; `scroll={false}` gives the bare leaf that `Syntax.Code` uses), so the shorthand replaces a hand-built `Syntax.Root/Content/Viewport/Code` wherever no filter or depth control is needed.

- 2e4c299: A markdown field held open no longer paints an empty box before its editor arrives: the CodeMirror view is built in a layout effect, so a pane that switches subjects — a task's description beside its history — renders in one frame instead of dropping everything below the field by the editor's height a frame later.

  Five hand-rolled empty states (no task selected, no task set, no sessions, no message selected, no result selected) now use `Banner.Empty` from `@dxos/react-ui`, so an empty pane reads the same everywhere and announces itself as a status.

  `Empty` moves from `@dxos/react-ui-list` to `@dxos/react-ui` as `Banner.Empty`: it is the same statement a banner makes — a message in place of content — for the one case that carries no valence and paints no surface, and most of its callers are panes rather than lists. Every call site moves with it, and a package that depended on `react-ui-list` only to say "nothing selected" no longer does.

  A task's history records what happened to the work — status, priority, estimate, assignment — and no longer narrates edits to its text. A title or description is edited by typing and commits on every blur, so logging those filled the history with "Description updated." and buried the entries a reader opens it for. The text is still written; it is simply not narrated, and a caller with something to say about such an edit still says it through `options.description`.

  `Column.Section` joins `Column` in `@dxos/react-ui`: a labelled run of content that spans the column's three tracks and re-exposes them, so a heading and plain content sit in the content track while a `Column.Row` inside still reaches the gutters. It is what a detail pane is made of — headings, prose, and rows with a leading control.

  A task's detail pane is now one column rather than four blocks each choosing its own left edge, and the pieces it is made of are components a host can mount on its own. `TaskEditor` is a task's title and markdown description with nothing around them — no create case, no selection, and no list context — which is what `TaskArticle` now renders instead of the list's editing strip. `TaskProperties` renders status, assignee, priority and estimate as a labelled list, each a menu whose trigger shows the value beside its glyph; the assignee's picker offers the space's people. `TaskTags` is the row's chip set, wrapped into a flow beside `TaskMnemonic`, the chip that copies a task's `@mnemonic`. The three sections share one geometry — a fixed 24px glyph column — so a glyph sits on the same axis in each.

  A GitHub link pasted into a description is now a chip in the editor as well as at rest: `linkWidgets` claims the bare `URL` node a GFM autolink produces, not only `[label](url)`, and `plugin-github` names the chip from the URL — `#123`, or `owner/repo`. The same description used to read two ways depending on which surface showed it.

  **Breaking.** `TaskList.Edit` is `TaskList.Editor`, and it renders the fields only: a task's questions and its history belong to the surface with room to answer and to read, so `showQuestions` and `onQuestionAnswer` are gone from `TaskList.Root`, and rows no longer replay the log under their title. `TaskHistory` and `TaskQuestion` place themselves and no longer take `subgrid` or `cells` (a host previously threaded its own column names into each child). A host that answered questions through the list — plugin-assistant's chat — renders them itself now.

- 813069c: Add `gap`, `align`, `justify`, `wrap`, and `center` props to the `Flex` primitive. `gap` accepts only named steps of the theme spacing ramp (`xs`–`2xl`, plus `form` and `form-section`), so the prop uses named spacing tokens instead of arbitrary Tailwind literals; `classNames` remains an unrestricted escape hatch. The `Gap`, `Align`, and `Justify` unions are exported for reuse.
- 098a0bb: Inbox surface: virtual folders, archive, and sender enrichment.

  **Inbox and Starred folders** join All Mail / Sent / Drafts / Subscriptions as mailbox child nodes, reusing the existing `properties.filter` + `systemTag` path — no new query machinery.

  **Archive** is available from both the conversation menu and the mailbox tile menu, grouped with Delete since both take a message out of the reading flow. Archiving from a dedicated message view closes the plank; restoring does not.

  Archive is modelled as the `inbox` system tag coming **off**, never a separate `archived` tag: Gmail models INBOX as a label and JMAP as a mailbox role, both already mapped by the providers, so one toggle serves both directions and no filter-complement operator is needed. Note that tag changes are not yet pushed back to the provider, so **a Gmail sync will restore an archived message** — pushing them is tracked separately.

  **Conversation menu** gains "Create Project" (the `CreateProjectFromMessage` operation previously had no UI) and sender enrichment. The latter arrives through a new `InboxCapabilities.SenderAction` capability rather than a direct import, because plugin-crm already depends on plugin-inbox; `createInvocations` returns a list so a contributor can express a composite (research, then image) without fusing it into one operation.

  **Pipeline actions are hidden until a connection is configured** — previously Enrich was offered on a mailbox with nothing to enrich.

  **`RecordArticle` gains a toolbar** sourced from the subject's own app-graph node, so any plugin can contribute type-specific actions to it; plugin-crm contributes Enrich for `Person` and `Organization`. `Card.Action` gains a `leading` slot so a row standing for a person can show their avatar instead of a generic glyph.

  **Removed:** `InboxOperation.ProcessMailbox` and its routine template. Its cursor helpers were shared with `ClassifyMailbox` and survive at `operations/cursor.ts` with a now-required consumer id; `ResetProcessCursor` becomes the generic `ResetFeedCursor`, also with a required `cursorId`. `CrmOperation.ProcessMailbox` is unrelated and unaffected.

- 557e243: `Message.Root` is now headless — it renders no DOM element, only the shared message context (ids, valence, icon). The message's element moved to `Message.Content`, which is now required inside every `Message.Root`: a `Column` grid carrying the alert/paragraph role, the aria wiring, the valence CSS variables and the valence surface. Hosts that rendered `Message.Title`/`Message.Body` directly under `Message.Root` must wrap them in `Message.Content`, and any `classNames`/`data-*`/`ref` previously on `Message.Root` moves to `Message.Content`.
- 29543ca: MOSAIC ui-template groundwork across the UI packages.

  - `Grid` layout primitive: track lists (`cols={['min-content', '1fr']}`), `subgrid`, `gap` from the spacing ramp, `align`/`center`, `contents`, and `asChild`.
  - `Show`/`Switch` conditional-rendering primitives: `<Show when fallback>` renders its children (or a render prop receiving the narrowed value) while `when` is present — anything except `undefined`/`null`/`false` — and `<Switch.Root on fallback>` renders the first `<Switch.Match when>` whose `when` strictly equals (or, as a predicate, matches) `on`. Both are DOM-free and mirror the ui-template `show`/`fallback`/`switch`/`match` grammar.
  - `Combobox`: the popover aligns exactly with its trigger (trigger-width content, zero collision padding), the trigger reuses the `Select` trigger slot and the placeholder role, and single-select lists emit one selection per press.
  - `Listbox`: visible row focus ring, `onDeselect` (Escape clears only a non-empty selection), and a `multiselectable` mode for externally-managed selection with option navigation.
  - `TaskList.Root`'s `onTaskCreate` now receives a `TaskDraft` (`{ title, ...optional patch fields }`) instead of a bare title, so a description (or priority/assignee) can be supplied when available.

- 0a3e9dd: Consolidate the progress components. `Progress` is the fill bar (renamed from `Status`, with its `status.*` theme keys now `progress.*`), `Stepper` draws a fixed plan as circles joined by flexing lines, and `TextCrawl` moves here from `@dxos/react-ui-components`, which gains `ProgressMeter` — the readout that assembles the three. **Breaking:** `Status` is gone; use `Progress`. `ProgressBar` and `ProgressMeter` move out of `@dxos/react-ui-components` and `@dxos/react-ui` respectively.
- 306f50d: Mail and calendar providers now own their own operations. `GoogleMailSync`, `GmailSend`,
  `MaterializeGmailTarget`, `GetGoogleCalendars`, `GoogleCalendarSync`, `MaterializeGoogleCalendarTarget`
  (was `MaterializeCalendarTarget`), `CreateGoogleCalendarEvent`, `GetGoogleContactGroups` and
  `GoogleContactsSync` move from `@dxos/plugin-inbox/InboxOperation` to
  `@dxos/plugin-google/GoogleOperation`; `JmapSync`, `MaterializeJmapTarget` and `JmapSend` move to
  `@dxos/plugin-jmap/JmapOperation`. Their operation DXNs change accordingly.

  The Inbox, Inbox (Send) and Calendar skills no longer name a provider: their tools are resolved from
  the connectors and send providers a deployment actually installs. A JMAP-only deployment previously
  advertised Gmail tools it could not run and had no sync tool of its own.

  A draft calendar event is now one carrying no foreign key from any provider, rather than none from
  Google — events synced by any other calendar connector were reported as perpetual drafts.

  `ScanMailbox` is now `AnalyzeMailbox`, and its progress meters name their phase as well as their
  mailbox ("Syncing Inbox", "Analyzing Inbox") — two meters run over one mailbox, so the bare name left
  the user unable to tell which was moving.

  A card header's leading depiction is now contributable per type via the `AppSurface.CardIcon` role.
  Hosts wrap their existing default in `CardIconSlot`, which renders a contributed surface when one
  matches and the default otherwise — `Surface`'s own `fallback` is the error boundary, and unlike
  `CardContent` a miss here cannot render nothing. Scoped to cards deliberately: a 6-unit card block
  affords initials or a photograph where a 16px navtree row does not, so non-card surfaces keep
  resolving `IconAnnotation` through `Obj.getIcon`. `ObjectAvatar` now derives its initials' hue from the
  object's label rather than its type, since a type declaring a single hue put every instance on the same
  disc; it is no longer a card's default depiction, only what a type opts into.

  **`@dxos/react-ui` breaking:** `Message` is renamed to `Banner` — `Message.Root`/`Content`/`Title` are
  now `Banner.*`, the `message.*` theme keys are `banner.*`, and the `Callout` alias is removed. A new
  `Deferred` holds a fallback back until a pending state has lasted `delay`, then keeps it for at least
  `minDuration`, so a momentary empty state is never rendered as the answer.

- b7822a7: Move `@dxos/react-ui` and its sibling packages from Radix Primitives to Ark UI (phases 1–4 of `packages/ui/react-ui/docs/MIGRATION.md`). `@dxos/react-hooks` now exports `createContext`, `composeRefs`/`useComposedRefs`, `useControllableState` and `composeEventHandlers`; every part renders through Ark's `ark.<tag>` factory with the same `asChild` contract. `Toggle`, `ToggleGroup`, `Input.Checkbox`, `Slider`, `react-ui-tabs` and `react-list`'s collapsible item run on Ark machines behind their existing props; `Toolbar` runs on `@dxos/react-focus`; `Separator` is a plain `role="separator"`. `Tooltip`, `Popover`, `DropdownMenu` and `ContextMenu` are no longer forks of Radix's floating layer but Ark machines: `DropdownMenu` and `ContextMenu` share one implementation, `Tooltip.Provider` is one machine serving every trigger, and `Popover.VirtualTrigger` feeds the machine's anchor. `Dialog`, `AlertDialog`, `Main`'s sidebars and `Select` run on Ark's dialog and select machines: `Dialog`/`AlertDialog` share one implementation, `Select` keeps its children-driven API by building Ark's collection from the rendered options, and `Toast` keeps its declarative API over Ark's toaster store. `@dxos/react-ui` no longer depends on any `@radix-ui` package and `@dxos/ui-theme` drops the `tailwindcss-radix` plugin. Breaking: the scoped-context exports of `@dxos/react-list`, `@dxos/react-input`, `@dxos/react-ui-grid`, `@dxos/react-ui-menu` and `@dxos/react-ui-syntax-highlighter` (`create*Scope`, `*ScopedProps`, `__*Scope` props) are removed, as are `createTooltipScope`/`createPopoverScope`/`createDropdownMenuScope`; `ScrollArea.Root` no longer takes `asChild`; `Input.Checkbox` renders a native input behind a styled control (element props reach the control, the ref reaches the input); `Toolbar.Root` drops the `dir` prop; `Popover.Content` drops `sticky`; the `--radix-*` CSS variables become Zag's (`--available-width`/`--available-height`, `--reference-width`, `--transform-origin`, `--arrow-size`, `--arrow-background`), and `Tooltip.Arrow`/`Popover.Arrow`/`DropdownMenu.Arrow` render Ark's `Arrow` + `ArrowTip`; `DropdownMenu.Root modal` is accepted but has no effect; `Select.Arrow`, `Select.ScrollUpButton` and `Select.ScrollDownButton` are removed (the machine scrolls the highlighted option into view), `Select.Root` takes only `value`/`defaultValue`/`onValueChange`/`open`/`defaultOpen`/`onOpenChange`/`disabled`/`required`/`name`/`form`, and a closed `Select`'s options stay mounted hidden; `Dialog.Content`'s `forceMount` is gone; `Toast.Root` renders a `div` with `role="status"` inside the viewport (not an `li`), `Toast.Provider` takes only `duration` and `overlap` (open toasts pile up and expand under the pointer by default; `overlap={false}` lays them out as rows), `Toast.Root` takes `open`/`defaultOpen`/`onOpenChange`/`duration`, and `Toast.Action`'s `altText` has no effect.
- c8b65f3: Adds `Drawer`, a panel that slides in from an edge of the viewport on Ark's drawer machine: swipe to dismiss, snap points for a bottom sheet, a grabber, modal and non-modal variants, a swipe area that opens it from the edge, and a `push` mode in which the panel is part of the page's layout and pushes its neighbours aside (`Drawer.Root transition` sets its open and close duration, `Drawer.Content size` its extent in rem, both matching `Splitter`'s so a drawer can sit in a split pane). Adds a Material-style `elevation` (0–5) to `Panel.Root`/`Toolbar`/`Content`/`Statusbar`, `Toolbar.Root`, `Card.Root`, `Dialog.Content` and `Popover.Content`: the part enters that level of the surface ladder (background, ink, derived hover/current/separator tones) and casts the level's shadow from `raised` up. `Panel.Root` takes the element to render as `as`. `Splitter.Panel` holds its anchored size as a fixed rem basis while split and caps its content at the pane's height.
- 9feee5e: `@dxos/react-ui`'s `Input` is `Field`, forms group their fields in real fieldsets, and popovers stay put.

  **`@dxos/react-ui` — Breaking:** `Input` is `Field`, named for what it is (Ark's `Field` plus the standard form of each control), with its parts named as Ark names them:

  - `Input.Root` → `Field.Root`, `Input.Label` → `Field.Label`, `Input.Description` → `Field.HelperText`, `Input.Validation` → `Field.ErrorText`, `Input.TextInput` → `Field.Input`, `Input.TextArea` → `Field.Textarea`; `Checkbox`, `Switch`, `PinInput`, `Date`, `DateTime`, `Time`, `Block` and `TriggerIcon` keep their names under `Field`.
  - `Input.DescriptionAndValidation` is gone: `Field.HelperText` is always the field's helper text and `Field.ErrorText` its error text, so a description and an error are two siblings rather than one paragraph that changed role with the valence.
  - Types and hooks follow: `InputRootProps` → `FieldRootProps`, `TextInputProps` → `InputProps`, `TextAreaProps` → `TextareaProps`, `InputValence` → `FieldValence`, `useInputValence` → `useFieldValence`, `useInputTrigger` → `useFieldTrigger`. The theme key `input` is `field`.
  - `Field.Checkbox` and `Field.Switch` accept label children: the control renders as a `<label>` around itself and the text, so a labelled control is one element at the call site instead of a hand-built row of `Field.Root`, `Flex`, the control and `Field.Label`.
  - `Fieldset.Legend` is floated so it lays out as an ordinary child (a flex item in a flex fieldset) while still naming the group.
  - **Breaking:** the `DropdownMenu` and `ContextMenu` namespaces are gone; both were `Menu`. `DropdownMenu.X` → `Menu.X`, `ContextMenu.Trigger` → `Menu.ContextTrigger`, `ContextMenu.X` → `Menu.X`; the `DropdownMenu*Props`/`ContextMenu*Props` type aliases → `Menu*Props`, `useDropdownMenuContext` → `useMenuContext`. Stories are `components/Menu` and `components/Menu/ContextTrigger`.
  - A popover, menu, select or tooltip no longer flashes at the viewport's origin on the frame before it is measured, and content anchored to a virtual element (`Popover.VirtualTrigger`, the editor's `dx-anchor` menus) follows the anchor when its container scrolls.

  **`@dxos/react-ui-form`:** groups in a form are real fieldsets, and the form's field components are named for what they are.

  - `Form.Section` and every schema group (`Form.FieldSet`, nested objects, object-array items, inline refs) render a `<fieldset>` named by its `<legend>`, so assistive technology announces the group. A nested group's legend holds its disclosure. `Form.Section`'s legend was inside a header `div` and never named the section.
  - **Breaking:** `Form.Row` is `Form.Field` (`FormRow` → `FormField`, `FormRowProps` → `FormFieldProps`): one label + control is a field. The former `FormField`, the schema-driven factory that picks a renderer per property, is `FormFieldDispatch`, with the decision extracted as the pure `resolveFieldRenderer`.

- d005fd9: `@dxos/react-ui/next` adopts Ark's part names throughout (DESIGN.md "Part naming"): `Content` is always the component's
  own element, scrolling is composed from `ScrollArea`, and items render a default row from their `item` data or are
  composed from `ItemIcon`, `ItemText`, `ItemDescription` and `ItemIndicator`. New and renamed parts:

  - `Next.Panel` hosts a plank as `Header`, `Body` and `Footer`; the header and footer size to their content.
  - `Next.Listbox` (Ark listbox) with item groups; `Listbox.Content scroll={false}` joins a host that already scrolls.
  - Drag and drop: `DragHandle` with keyboard moves, `DropIndicator`, `DragPreview`.
  - `Menu.RadioItemGroup`, `Menu.TriggerItem` and `Fieldset` take Ark's names; Combobox exports `Control`, `Input`,
    `Trigger` and `ClearTrigger`; `Field.Label` marks required fields itself.
  - `Tag` takes `onClick` and `onDelete`; `Icon` takes `valence`; `Card.Root` takes `grid` to put row icons and actions
    in its gutters; `Select.Trigger` takes `fit='options'`; `SystemButton.Remove` is a new preset.

  Popups open at their trigger's size, grow to fit their options, and reserve room for the scroll thumb only while they
  overflow. Tooltips open after 600ms, Combobox arrow keys stop at the ends, and NumberInput uses compact steppers and
  tabular figures. A `./next/testing` entry exports the Next story helpers.

  `@dxos/react-ui-list/next` is a new entry with `Listbox` and `OrderedList` on those parts, plus a private `Tree`
  prototype on Ark's tree-view. Reorder drags declare a move, so the browser's copy cursor no longer flickers over the
  dragged row, and `useReorderList`'s `dragPreview` renderer also receives the dragged row. The package now emits its
  declared `./util` entry.

  The plugin registry's list is the first surface on Next: rows in a `Next.Panel` under a filter toolbar. The sheet's
  range list follows on `OrderedList`, and its ranges can now be reordered by drag or keyboard.

- 0e44f24: `Main`'s sidebars run on Ark's drawer machine below `lg`. Both sidebars now close on a swipe toward their edge (`swipeToDismiss`, on by default), and a touch swipe inward from the screen edge opens a closed one (`swipeToOpen`, on by default; the edge strip is touch-only). Dismissing one sidebar no longer dismisses the other. The sidebar's label is on the element at every width. `useSwipeToDismiss` is removed. The public API, the three-state model and the layout at `lg` are unchanged.
- cef0a3b: `@dxos/react-ui/next` exports the next-generation `Next.*` primitives: Container, ScrollArea, Toolbar, Separator, Field,
  FieldSet, Input, Textarea, DateInput, Select, Combobox, Checkbox, Switch, Button (icon-only via `iconOnly`), Toggle,
  ToggleGroup, Dialog, AlertDialog, Popover, Menu (checkbox, radio and nested items), Tooltip, Card, Image, Collapsible,
  Tag and more. Load their styles once with `import '@dxos/react-ui/next/theme.css'`. The existing `@dxos/react-ui`
  components are unchanged; the new namespace sits beside them so plugins can adopt it one component at a time.
- bd06669: Adds `Toc` and `Tour` on Ark's machines, and moves the welcome tour off `react-joyride`. `Toc.Root` takes the headings as `{ value, depth }` items and an optional scroll container, watches which headings are in view and marks their links (`aria-current="location"`, `data-active`); `Indicator` is a bar beside the active items, `Item` indents by depth, and `Link` scrolls the heading into view within the container instead of jumping the page (headings must carry the ids the items name). `useTour` takes a walkthrough's steps (tooltip steps beside a target, dialog steps centred, with actions, arrow, backdrop and an effect that runs before a step shows) and `Tour.Root` provides it; `Backdrop` cuts the target out of the scrim, `Spotlight` frames it, and `Positioner`/`Content`/`Arrow`/`Title`/`Description`/`ProgressText`/`Close`/`Control`/`Actions`/`ActionTrigger` make up the card. The machine waits for a target to appear, scrolls it into view, marks it `data-tour-highlighted` (which shows hover-revealed controls), traps focus and walks steps on the arrow keys. `plugin-support`'s welcome tour runs on it: `Tour.Step` is now `{ target, title, description, placement, before }` (`content` is `description`; the joyride-only fields are no longer accepted), and `react-joyride` is gone. Below `lg`, dismissing a `Main` sidebar now returns it to `collapsed` rather than `closed`, and the edge swipe opens it from there.
- 1d6f730: Replace `@fluentui/react-tabster` with `useFocusGroup` in `@dxos/react-ui`, which provides arrow-key navigation and `Tab` boundaries for composite widgets in a fraction of the size — 68 KB left the eager boot graph. `Focus.Group`, `Main`'s landmarks, `Carousel`, `Tabs`, `Masonry` and the `react-ui-list` components keep their keyboard behaviour; consumers calling tabster's hooks directly should move to `useFocusGroup` and `findFirstFocusable`.
- fc83abd: ScrollArea now overlays the scrollbar thumb on the content instead of reserving layout width for a
  native scrollbar. Native scrolling is retained, so scroll chaining and nested scrollers are
  unchanged. Pass `native` to restore the classic native scrollbar, which consumes layout width.

  The `padding` option reserves the strip the overlay thumb occupies, so content clears it.

- a805212: Split the sizing utilities and remove `dx-container`.

  `dx-expander` is renamed `dx-expand` and decomposes into `dx-fill` (`h-full w-full`) and `dx-grow` (`flex-1 min-h-0 min-w-0`), so a class names how the parent sizes the element rather than bundling five properties. `dx-container` is removed: its `overflow-hidden` duplicated the `min-*-0` it already carried — any non-visible overflow zeroes a flex/grid item's automatic minimum size — and clipped everything as a side effect. Call sites that genuinely clip now say `overflow-hidden` explicitly. `dx-fullscreen` loses its `overflow-hidden` for the same reason.

  `withColumn.propagate()` selected on `.dx-container` to keep a ScrollArea's scrollbar in the gutter; that marker is now an explicit `dx-scroll-boundary` on `ScrollArea.Root`.

  Adds a `prefer-sizing-utilities` lint rule for the hand-rolled equivalents.

- 6fed038: Add people you already share a space with to another space: a contact picker on the space members
  article admits them by identity key and returns a `?spaceKey=` join link that brings the guest into
  the space, and the account profile gains a Contacts article. `space.admitContact(contact, role?)`
  takes a role, defaults to Editor instead of Admin, and records the contact's profile; `Contact`
  carries the contact's `did`. `Combobox.Item` forwards extra props, and `Listbox.ItemContent` sizes
  its icon column to wider icons and accepts block content in `description`.

  Breaking: `Clipboard` (`Clipboard.Button`, `Clipboard.IconButton`, `Clipboard.Provider`) and
  `useClipboard` are removed from `@dxos/react-ui`; use `SystemIconButton.Clipboard` with `value` (or
  `onCopy`), adding `iconOnly` for the icon-only form. It needs no provider.

- 4c5b2c7: `Timestamp` shows an instant in the room a column has — `now`, minutes to two hours, hours to a day, then a calendar date — and carries the full instant in a tooltip, since everything it shows is lossy by design.

  Minutes run past the hour because `90m` is a duration a reader feels where `1.5h` is one they compute. It counts live, scheduling each tick for the moment its value changes rather than on a fixed interval: a minute counter wakes once a minute, an hour counter once an hour, and a calendar date never wakes at all — a row that says `1m` ten minutes later is worse than no counter, because the reader believes it.

  A task's activity log renders its entries with it, in place of the "about 2 hours ago" that a log column has no width for.

- f9816c0: Toasts that close on a timer now draw a bar that empties as their time runs out, and hold it while
  the pointer is over them. `Progress` gains the `countdown` and `paused` props behind it.
- 525aee0: Navtree rows drag in Safari, and a branch held mid-drag opens with its children already loading.
  Breaking: `Tooltip.Trigger`'s `onInteract` no longer receives the event and keeps the tooltip closed when it returns `false`.

### Patch Changes

- c020513: A `Banner` with no `Banner.Title` now pads the top of its body to match the bottom, so the text no
  longer sits against the banner's top edge.
- 5262408: `SystemIconButton.Clipboard` now runs an `onClick` passed to it before copying, where it used to drop it. Clicking a task's short ID in the task list copies its URI without also selecting the row.
- b63506b: `SessionConfig` (`@dxos/ai`) describes how an AI session runs — for now its model. **Breaking:** `Chat.model` (a ref whose URI was the model DXN) is replaced by `Chat.session: SessionConfig`, and `AgentService.Conversation.model` by `Conversation.session`; a model stored on an existing chat is not carried over, so that chat starts on the default once. `Project.session` sets the default for the sessions a project starts: a chat it creates, or one it delegates tasks to, is seeded from it (`Chat.seedSession`), and a model later picked in the chat stays the chat's own.

  `Tree` takes `indentGuides`, a vertical line down each open branch's children under the branch's chevron; a windowed tree draws it as per-row segments. The task list always shows them. **Changed geometry:** every tree indents each level by one block (`TREE_BLOCK`, 1.5rem — the icon plus a compact `IconButton`'s padding), which is also the width of the chevron column and the icon cell, so a child's chevron is centred under its parent's icon (previously an 8px step). A windowed tree now animates disclosure: opened rows fade in, and a close conceals the children before the branch collapses. A branch's count badge centres its number.

  The debug console's `report` command sends the title as the issue body when `--body` is omitted. `SystemIconButton.Clipboard` keeps a visible label through a copy, so a chip naming what it copies no longer changes size. A task's mnemonic chip renders in the monospace face, and a file card fits its image inside the card by default. Registry plugin cards carry a shadow, and the neutral surface (neutral tags, callouts, badges) is lighter in light mode.

- a04ab6e: Navigating to a collection in the navtree highlights the collection rather than the documents its deck
  opened in its place (`@dxos/plugin-deck/DeckSeed.sourceOf`), and choosing one of those documents
  selects it (`NavTreeCapabilities.State.pick`); a flattened deck opens the collection itself instead of
  showing its documents as a breadcrumb trail. `Tree` leaves a dragged row in place at half opacity
  (`hideDragSource` restores removal) and declares drags a move, so the cursor no longer flickers to a
  copy "+". `Gantt.Chart` opens scrolled to its newest events.

  Task list rows show a task's pull requests in their own column on the title line, left of the
  assignee; the assignee picker offers the space's members, the owner included (`TaskProperties` takes
  `members`); the assignee chip opens its session card on click rather than hover, which had left it
  stuck open. `tasks.create` and `tasks.update` reject an assignee that names no one — it must carry a
  contact, a member's `identityDid`, or an agent session. Copy-to-clipboard buttons use
  `SystemIconButton.Clipboard`, so they share one icon and the "Copied" confirmation.

- d4b4919: `dx-anchor` preview cards now open on hover by default (`trigger='click'` opts out) with a
  shadcn-style fade+zoom animation; hosts close on `state: false`. Editor block widgets survive
  replacement (root-keyed unmount) and suspending portals; `#`/`@` link chips resolve the linked
  object's label.
- e2b04f6: `Tabs.Tablist` sizes itself as a toolbar item when rendered inside a `Toolbar.Root` (content width, unpadded, never squeezed by a full-width sibling), so containers no longer pass `w-auto`/`p-0` to embed tabs in a toolbar. The Project article's Overview/Tasks tabs, which had collapsed to zero width beside the action toolbar, are visible again and are now part of the article's single action toolbar. The Projects plugin declares the Assistant plugin as a dependency, so hosts that run Projects (including the CLI) register Assistant beside it.
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

- 178bc6d: The session timeline draws a task that no session's checklist holds as a lane of its own, spanned by its edit history, so tasks worked by an external harness (e.g. Claude Code) or by hand appear on the project pipeline chart. Task lanes (bar, nodes, thread and legend dot) and the task mnemonic chip share a hue hashed from the mnemonic, and the chip leads with the Task type's icon instead of a trailing clipboard glyph; `SystemIconButton.Clipboard` takes an optional `icon` for that idle glyph.
- 8904184: Restore `role="toolbar"` on `Toolbar.Root`, which was erased when no role was passed, forward an explicit `role=''` instead of falling back to the default, and lay out simple-layout navigation tiles as a single row instead of stacking the icon, label, and caret.
- 82a9c4e: A task's properties show when it was created, from the database's record of the object. `Timestamp`
  (and `formatCompact` / `compactInterval`) accept a Unix timestamp in milliseconds as well as an ISO
  string or a `Date`. The task set's sort button reads the field alone ("Priority"), without an "Order:" prefix.
- 6fd2a5d: `Tooltip.Trigger` now opens on the requested `side`. Before, Ark's default `bottom` placement overrode it.
- f112c37: New `@dxos/react-ui-trace`: the `Timeline` commit graph and `Gantt` (moved from `@dxos/react-ui-components`), the `ProcessTree`, a presentational `TracePanel`, and the pure builders behind them — `buildExecutionGraph` (span tree → commits) and `buildSessionTimeline` (sessions, tasks and sub-agents on a time axis, now over a `Session` input rather than a `Chat`). The agent trace events (`AgentRequestBegin/End`, `CompleteBlock`, `PartialBlock`, `DelegationSpawned`, `RequestPhase`, `McpServerError`) move from `@dxos/assistant` to `@dxos/compute` `Trace`, and `Process.isHarnessHost` identifies a conversation's agent process by its annotation, so the package depends on the compute layer only. `@dxos/react-ui-components` no longer depends on `@dxos/assistant`; the message-based `useExecutionGraph` hook is gone (its two consumers inline it). `@dxos/plugin-assistant` keeps the app-bound `TracePanel` container and `useSessionTimeline`, whose lanes now carry `sessionId` instead of `chatId`.

  TracePanel: processes are multi-selectable (click selects one, meta-click toggles; selection kept in view state) and the trace narrows to the selected processes and their children; each trace line shows a `HH:mm:ss` timestamp. `Tree` gains a `multiple` selection mode where a plain click selects a row alone and a meta-click toggles it (`onSelect` reports `meta`), and `createStaticTreeModel` an `isCurrent` seed. `Accordion.Root` gains `rounded`.

- 8048e42: Make the trace panel's cost depend on the viewport rather than the history: the timeline windows its rows through `useWindow` from `@dxos/react-ui-virtual`, the debug span tree renders in a read-only CodeMirror view instead of a whole-document syntax highlighter, and the execution graph builds in linear time with its inputs debounced. `SyntaxHighlighter` renders source above 20k characters unhighlighted, since tokenizing it costs tens of seconds in one synchronous render. A controlled `Editor.View` now syncs its `value` by dispatching only the changed ranges, so an update keeps the reader's folds, selection and scroll position. The trace panel opens at the top rather than pinned to its tail, behind a fade of one row: `ScrollContainer.Fade` takes `classNames` to size its gradient, and `Accordion.Root` takes `border` (on by default) so a host can drop the frame around its items.
- Updated dependencies [6a457ac]
- Updated dependencies [3c7b013]
- Updated dependencies [fd873d2]
- Updated dependencies [2d58ea5]
- Updated dependencies [fd23a8b]
- Updated dependencies [b63506b]
- Updated dependencies [6af89f4]
- Updated dependencies [7ec1738]
- Updated dependencies [df295b2]
- Updated dependencies [4dccfd3]
- Updated dependencies [472ca95]
- Updated dependencies [8cb5553]
- Updated dependencies [967b130]
- Updated dependencies [882ac2a]
- Updated dependencies [ce194c0]
- Updated dependencies [818a096]
- Updated dependencies [4aa6a33]
- Updated dependencies [9d2466a]
- Updated dependencies [08cddf6]
- Updated dependencies [07531e0]
- Updated dependencies [d4b4919]
- Updated dependencies [5662dfc]
- Updated dependencies [b1bb838]
- Updated dependencies [e680b16]
- Updated dependencies [a805212]
- Updated dependencies [6a1ec57]
- Updated dependencies [32584c9]
- Updated dependencies [631df48]
- Updated dependencies [e8088ea]
- Updated dependencies [928e0b2]
- Updated dependencies [1a3de22]
- Updated dependencies [520c34f]
- Updated dependencies [77d0026]
- Updated dependencies [6dadb41]
  - @dxos/ui-theme@0.12.0
  - @dxos/effect@0.12.0
  - @dxos/lit-ui@0.12.0
  - @dxos/react-focus@0.12.0
  - @dxos/util@0.12.0
  - @dxos/async@0.12.0
  - @dxos/log@0.12.0
  - @dxos/ui-types@0.12.0
  - @dxos/react-hooks@0.12.0
  - @dxos/react-error-boundary@0.12.0
  - @dxos/i18n@0.12.0
  - @dxos/invariant@0.12.0

## 0.11.1

### Patch Changes

- @dxos/async@0.11.1
- @dxos/debug@0.11.1
- @dxos/i18n@0.11.1
- @dxos/invariant@0.11.1
- @dxos/lit-ui@0.11.1
- @dxos/log@0.11.1
- @dxos/react-error-boundary@0.11.1
- @dxos/react-hooks@0.11.1
- @dxos/react-input@0.11.1
- @dxos/react-list@0.11.1
- @dxos/ui-types@0.11.1
- @dxos/util@0.11.1

## 0.11.0

### Minor Changes

- ed992c2: Remove `className` from `ComposableProps`, so `classNames` is the only styling prop a consumer may
  pass to a composable or slottable component. Accepting both gave every part two indistinguishable
  props, and a part that destructured one while spreading the other silently dropped the caller's
  classes. Passing `className` to such a component is now a compile error; rename it to `classNames`.
  Radix `Slot` still injects `className` at runtime — implementations receive it through
  `HTMLAttributes` and `composableProps` merges it, so slotted composition is unchanged.
- ed992c2: Put controls on a single three-step scale — 24 / 32 / 40px (`sm` / `md` / `lg`) — replacing 17
  distinct heights. Breaking: the `xs` density is removed (`Density` is now `'lg' | 'md' | 'sm'`) and
  anything previously `sm` (28px) renders at 24px.

  `DensityProvider` supplies density through React context only and renders no DOM; controls read it
  and emit `data-density`, which overrides `--dx-control` for that element alone. It deliberately does
  not emit a `dx-density-*` class — that set the knob for an entire subtree, so a provider intended for
  one region silently resized unrelated descendants. A region that wants subtree-wide density applies
  the class itself at the call site, as `Toolbar.Root` does.

- d958118: Inbox draft composer rebuilt as a compose-style form, plus the shared UI it needs. `@dxos/react-ui` `Input.TextInput` gains MUI-style `start`/`end` adornments rendered inside the input container; `@dxos/ui-theme` adds a shared `.dx-input` box treatment (surface + hairline border + focus-within shift) now used by Input, `MarkdownField`, `RefEditor`, and the inbox editor. `@dxos/react-ui-form` `RefEditor` email mode renders committed mailboxes as atomic tag widgets (trailing delete affordance, no `@` marker) — a raw address stays plain text until committed with comma/Space/Enter, typing before a tag starts a fresh token, and the single line is centered so text and tags align. `@dxos/ui-editor`'s `defaultThemeSlots` is now `fullWidth` (no longer forces `h-full`). `@dxos/plugin-inbox` `EditMessage` gains To/Cc/Bcc recipient pickers with Person autocomplete, arrow-key field navigation, and a layout fix so Send no longer overlaps the editor.
- e65432c: Rework the light-mode surface ladder and control states.

  Surface levels, separators, wells, scrollbar thumbs and rail tones are now
  derived from the enclosing `--surface-bg` and attenuated for light mode through
  a single `--dx-attenuate-*` table, replacing several fixed neutrals that had
  drifted from the ladder. Filled controls derive their hover from their own fill
  (`--color-input-bg-hover`) rather than from the host surface, so hovering a
  default button no longer lightens it into the selected tone. `Panel.Toolbar`
  owns the toolbar bar treatment, so a nested `Toolbar.Root` matches content width
  without floating. Cards now carry their padding unconditionally.

- 51aaffe: Rename `Message.Content` to `Message.Body` and add a new optional `Message.Content` wrapper that carries the message's default padding. `Card.Root` accepts a `gutter` prop so a card whose body is a form insets its fields like a standalone form.
- 848ba1b: Add a `Slider` primitive built on the Radix slider (`Slider.Root`/`Track`/`Range`/`Thumb` composed behind a single themed component), supporting one or more thumbs, horizontal and vertical orientation, and a disabled state. `react-ui-form`'s `Form.Row` gains an additive `labelEnd` slot that renders trailing content at the end of the label row, so a field can show a live value beside its label without nesting it inside `Input.Label` (which would change the input's accessible name).
- 55bb048: Runtime icon resolver: `ThemeProvider` mounts a shared `IconRegistry` that ingests the static `/icons.svg` sprite into an in-DOM defs container and resolves missing icons on demand from a per-icon-set route (Phosphor at `/phosphor/{weight}/{name}.svg` by default, configurable via `IconSource`), so icons referenced only by runtime-loaded plugins render without being present in the build-time sprite. `useIconHref` now returns a same-document `#name` href (or `undefined` while unresolved), and `<dx-icon>` consumes the same registry via a `globalThis.__dxIconRegistry` bridge. Breaking: the unused `noCache` prop is removed from `ThemeProvider`, `withTheme`, and `<dx-icon>` — cross-document sprite URLs are no longer built, so there is nothing to cache-bust.
- ed992c2: Consolidate the theme's elevation ladder onto a single documented definition and remove dead theme
  surface. Breaking: `Column.Bleed` (unused; `ScrollArea` auto-bleeds inside `Column.Root`),
  `ghostHover`/`ghostFocusWithin` (use the `dx-hover` utility), and `densityBlockSize` are removed; the
  `.dx-panel` hue-tinted callout class is renamed `.dx-callout`; the unconsumed `--dx-lacuna-*`,
  `--dx-input-{sm,md,lg}`, `--spacing-icon-button-padding`, and `--spacing-scroll-padding` tokens and
  the `dx-column`, `dx-hover-row`, and `dx-current-row` classes are deleted. Light-mode elevation
  levels 1 and 3 shift one ramp stop so the ladder is monotonic in both themes, and `.dx-density-md`
  is now defined so a nested region can reset density.
- ed992c2: Rework the surface system around six named elevation levels (`sunken`, `chrome`, `base`, `raised`,
  `overlay`, `popup`). Chrome now sits below the document canvas and cards above it, so panels read as
  raised rather than recessed. Toolbars, groups and inputs are no longer fixed levels: they derive
  from whichever surface hosts them, so a toolbar in a card and a toolbar on the canvas each read
  correctly. Enter a surface with `data-surface="<level>"` or the matching `dx-*-surface` class; a bare
  `bg-*-surface` utility paints the colour without publishing the surface, so states inside it will not
  derive. Fixes `selected-surface` silently tracking the root surface instead of its own zone, and the
  app canvas not painting a surface at all.

### Patch Changes

- e0e1a9f: Supporting changes for the new plugin-blogger / plugin-typefully feature:
  - **@dxos/plugin-connector**: expose `Connection` types via a new `./types` export subpath so provider plugins can consume the connection contract without pulling the full package barrel.
  - **@dxos/react-ui**: `Card.Root` now accepts and forwards `onKeyDown`, enabling keyboard-interactive cards (Enter/Space activation) without a cast.

- 2fe5a7a: `useThemeContext` no longer throws when no `ThemeProvider` is mounted; it falls back to the default theme (with a one-time warning) so error-reporting surfaces such as the fatal dialog remain renderable.
- c9651f1: Logger panel review follow-ups:
  - **@dxos/react-ui-debug**: each `Logger.Root` recording session now self-filters via its own parsed filter and registers in a module-level recorder registry that composes the shared `@dxos/log` config (union) and restores it on the last release — concurrent panels with divergent filters no longer clobber each other. The log list gains a per-row checkbox (Copy log then exports only the checked rows), full-line selection styled via `aria-current`/`dx-current`, arrow-key navigation between lines (inner controls opt out of the roving tabindex), Space to toggle expansion, and Enter to toggle the checkbox. Expanded rows render message/context via `JsonHighlighter` and error stacks via the shared `ErrorStack` (clickable `vscode://` frames). Each log record also retains the derived package (from its source path) for display/export.
  - **@dxos/react-ui**: `ErrorStack` now accepts a `classNames` prop so consumers can style the trace container.

- 717edc0: `MediaPlayer` now honors an explicit `kind` prop for native playback of extensionless sources (e.g. `blob:`/`data:` URLs), instead of falling back to an `<img>` when the URL has no recognized media extension.
- 37874ce: Move contexts, hooks, constants and helpers out of React component modules into sibling modules so each component module is a react-refresh boundary. Public package APIs are unchanged; the previously exported names are re-exported from each directory barrel.
- Updated dependencies [aea1e6e]
- Updated dependencies [ed992c2]
- Updated dependencies [3f1fc67]
- Updated dependencies [e65432c]
- Updated dependencies [f6a01e3]
- Updated dependencies [4df6cf3]
- Updated dependencies [c58ebb7]
  - @dxos/async@0.11.0
  - @dxos/ui-types@0.11.0
  - @dxos/util@0.11.0
  - @dxos/ui-theme@0.11.0
  - @dxos/log@0.11.0
  - @dxos/react-error-boundary@0.11.0
  - @dxos/react-hooks@0.11.0
  - @dxos/lit-ui@0.11.0
  - @dxos/react-input@0.11.0
  - @dxos/react-list@0.11.0
  - @dxos/debug@0.11.0
  - @dxos/i18n@0.11.0
  - @dxos/invariant@0.11.0
