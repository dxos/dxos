# @dxos/react-ui-form

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
