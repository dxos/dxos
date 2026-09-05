# UI Ontology

A vocabulary for the `@dxos/react-ui*` family: what **kinds** of things it contains, and what
**aspects** cut across them.

Descriptive, not aspirational — every row names something implemented today, with the package and
component that implements it. Where a kind or an aspect is thin or inconsistent, the row says so
rather than smoothing it over; those gaps are the point.

Two audiences. A person deciding which primitive to reach for reads the Kind column. The DEUS app
dialect ([`packages/reflect/deus/lang/app.mdl`](../../../reflect/deus/lang/app.mdl)) and the `Ui`
schematic dialect ([`plugin-illustrator/src/model/ui.ts`](../../../plugins/plugin-illustrator/src/model/ui.ts))
need a closed set of terms to emit into, and this is where that set is fixed.

Conventions: exemplars are `package › Component`, with `@dxos/react-ui` abbreviated as `react-ui`.
Component paths are directories under a package's `src/components` unless noted.

## Goals

The ontology is not documentation for its own sake. Three things depend on having a closed,
named vocabulary.

**1. Framework independence.** The kinds are meant to survive a port. A `Collection` is a
collection whether it renders through React, Solid, or a web component — what changes is the
renderer, not what the thing is. This is not hypothetical here:
[`solid-ui-geo`](../../solid-ui-geo) is a working Solid port of `react-ui-geo` with the same three
components (`Globe`, `Map`, `Toolbar`), and [`lit-grid`](../../lit-grid) is the web-component
implementation that `react-ui-grid` wraps. Both prove the split is real; neither is described in a
way that would let a third renderer follow without re-deriving the design. Naming the kind is the
first step to specifying it once and rendering it many times.

**2. Aspects as hooks, not as inheritance.** Every aspect in Table 2 is a concern that recurs
across unrelated kinds — a `Collection`, a `Spatial surface`, and an `Arrangement` all need
selection, and none of them should implement it. The target shape is one hook (or one
framework-agnostic machine plus a thin per-framework binding) per aspect, consumed by any kind that
needs it. Some aspects already have this shape: density and elevation are context + hook, attention
is a provider plus `useArticleKeyboardNavigation`. Selection and key bindings do not, which is why
they are the two entries under "aspects that are named but not yet owned".

**3. A closed vocabulary for declarative UI.** The DEUS app dialect and the `Ui` schematic dialect
both need a fixed set of terms to emit into and validate against. An open-ended vocabulary means a
generated scene can name a component that no renderer implements, and nothing catches it. The tag
column below is that set: a scene, a schematic, or an MDL block refers to a kind by tag, and a tag
that is not in this table is a validation error rather than a silent no-op.

### What follows from the goals

- **A kind must be definable without reference to React.** If the only way to say what something is
  involves hooks, context, or JSX, the definition is wrong.
- **An aspect must be extractable.** If an aspect cannot be lifted out of the components that use
  it, it is not yet an aspect — it is a coincidence. The audit's job is to expose those.
- **Components are addressed by package and name, never by name alone.** The audit shows `Grid`,
  `Toolbar`, `Tree`, `Board`, `Picker`, `Editor`, `Calendar`, `ToolForm`, and `ToolList` each
  occurring in two or more packages under different kinds. Bare names are ambiguous.

## 1. Kinds of components

A **kind** is defined by what a component owns, not by what it looks like. A row's defining
question is "what is this thing responsible for?" — a `Control` owns one value, a `Container` owns
chrome and slots, an `Arrangement` owns where its children sit.

| Tag                 | Kind                  | What defines it                                                                               | Exemplars                                                                                                                                                                                                                                             | Composes with           |
| ------------------- | --------------------- | --------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| `control`           | **Control**           | Atomic. Owns exactly one value and reports changes. No children of consequence.               | `react-ui › Input` (`.TextInput`, `.Switch`, `.Checkbox`), `Select`, `Slider`, `Button`, `IconButton`, `DatePicker`                                                                                                                                   | Form, Toolbar, List row |
| `composite_control` | **Composite control** | Several controls plus a data source, resolving to one value or reference.                     | `react-ui-list › Combobox`, `Picker`; `react-ui-form › ObjectPicker`, `RefEditor`; `react-ui-pickers › EmojiPicker`, `HuePicker`, `IconPicker`; `react-ui-search › SearchList`                                                                        | Form, Overlay           |
| `display`           | **Display**           | Renders, never accepts input. No value, no handlers.                                          | `react-ui › Icon`, `Image`, `Avatars`, `Skeleton`, `Progress`, `Separator`, `Tag`, `TextCrawl`; `react-ui-components › Spinner`, `Shimmer`, `ProgressMeter`                                                                                           | Anywhere                |
| `layout`            | **Layout primitive**  | Pure geometry. Contributes no chrome, no colour, no semantics.                                | `react-ui › Flex`, `Grid`, `Container` (`src/primitives`), `Column`, `Splitter`                                                                                                                                                                       | Anywhere                |
| `container`         | **Container**         | Owns chrome and named slots; children go in slots, not in a free-form flow.                   | `react-ui › Panel` (`.Toolbar`/`.Content`/`.Statusbar`), `Card`, `Main`, `Banner`; `react-ui-components › TogglePanel`                                                                                                                                | Layout, Scroll, Command |
| `scroll`            | **Scroll surface**    | Owns the overflow and the height chain that makes overflow scrollable.                        | `react-ui › ScrollArea`, `ScrollContainer`; `react-ui-virtual › Window`, `follow`                                                                                                                                                                     | Container, Collection   |
| `arrangement`       | **Arrangement**       | Owns _where_ children sit, and usually lets the user change it. Position is data.             | `react-ui-mosaic › Mosaic` (`Stack`, `VirtualStack`, `Board`), `react-ui-masonry › Masonry`, `react-ui-dashboard › Dashboard`, `react-ui-board › Board`, `react-ui › Carousel`                                                                        | Tile/Card, DnD          |
| `collection`        | **Collection**        | Ordered view over a set of items, with selection and keyboard traversal.                      | `react-ui-list › Listbox`, `OrderedList`, `Tree`, `Treegrid`, `Accordion`, `MasterDetail`; `react-ui-table › Table`; `react-ui-grid › Grid`                                                                                                           | Scroll, Form, DnD       |
| `form`              | **Form**              | Schema-driven editing of a whole object; layout derived from a projection, not hand-authored. | `react-ui-form › Form`, `ObjectForm`, `FieldEditor`, `ViewEditor`, `ObjectProperties`, `ObjectTree`; `react-ui-components › QueryForm`                                                                                                                | Container, Control      |
| `command`           | **Command surface**   | Presents actions. Carries no behaviour itself — every item resolves to an operation.          | `react-ui › Toolbar`, `Menu`; `react-ui-menu › Menu`, `DropdownMenu`, `ToolbarMenu`, `builder.ts` (`MenuBuilder`)                                                                                                                                     | Container, Collection   |
| `navigation`        | **Navigation**        | Moves between places rather than acting on the current one.                                   | `react-ui › Breadcrumb`, `Stepper`, `Main.NavigationSidebar`; `react-ui-tabs › Tabs`; `react-ui-components › NumericTabs`; `react-ui-list › Tree` (navtree)                                                                                           | Container, Overlay      |
| `overlay`           | **Overlay**           | Escapes the layout: positioned against an anchor or the viewport, above everything.           | `react-ui › Dialog`, `Popover`, `Tooltip`, `Toast`; `react-ui-chat › ChatDialog`                                                                                                                                                                      | Anchoring, Elevation    |
| `text_surface`      | **Text surface**      | A document. Owns a text model, a cursor, and its own keymap.                                  | `react-ui-editor › Editor`; `react-ui-markdown › MarkdownView`, `MarkdownStream`; `react-ui-syntax-highlighter › SyntaxHighlighter`, `JsonHighlighter`; `react-ui-terminal › Terminal`; `react-ui-components › TextBlock`, `HtmlViewer`               | Container, Command      |
| `spatial_surface`   | **Spatial surface**   | A coordinate space. Children have positions in that space, not in document flow.              | `react-ui-canvas › Canvas`, `CellGrid`, `Grid`; `react-ui-canvas-editor › Editor`; `react-ui-diagram › Diagram`; `react-ui-graph › Graph`, `Mesh`, `Tree`; `react-ui-geo › Globe`, `Map`; `react-ui-gameboard › Gameboard`, `Chessboard`              | Container, Selection    |
| `conversation`      | **Conversation**      | An append-mostly sequence of authored messages, with composition at one end.                  | `react-ui-thread › Thread`, `Message`; `react-ui-assistant › ChatThread`, `MessageChrome`; `react-ui-chat › ChatEditor`, `ChatStatus`; `react-ui-feed › MessageList`, `Block`, `Minimap`, `Outline`                                                   | Scroll, Text surface    |
| `time_based`        | **Time-based**        | State advances on its own; the UI reflects a stream or a clock.                               | `react-ui › MediaPlayer`; `react-ui-transcription › Transcription`, `MicSettings`, `PipelineStatus`; `react-ui-audio › Oscilloscope`; `react-ui-components › Waveform`, `Timeline`                                                                    | Container, Display      |
| `provider`          | **Provider**          | Renders no DOM of its own. Supplies context that aspects below read.                          | `react-ui › ThemeProvider`, `DensityProvider`, `ElevationProvider`, `Clipboard`, `Deferred`, `ErrorFallback`, `Focus`; `react-ui-attention › AttentionProvider`, `ViewStateProvider`; `react-ui-editor › EditorMenuProvider`, `EditorPreviewProvider` | Wraps anything          |

### Notes on the boundaries

- **Arrangement vs Collection.** Both hold many children. A Collection's order comes from the data;
  an Arrangement's position _is_ data the user edits. `Mosaic.Stack` is an Arrangement even though
  it looks like a list, because dragging a tile changes the model.
- **Container vs Layout primitive.** `Panel` is a Container: it has named areas and a surface.
  `Grid` is a Layout primitive: it has tracks and nothing else. The test is whether removing it
  changes how the page _looks_ beyond geometry.
- **Text surface vs Control.** A single-line `Input` is a Control; an `Editor` is a Text surface.
  The line is the keymap: a Text surface owns keybindings that a Control would forward to its
  parent.
- **Composite control vs Form.** A Composite control resolves to one value. A Form edits a whole
  object against a schema.

## 2. UI aspects

An **aspect** is a concern that shows up across many kinds and is answered in one place. Each row
names where that one place is; where there isn't one, the row says so.

| Aspect             | What it governs                                                                                        | Where it lives today                                                                                                                                   | Carried by                       |
| ------------------ | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------- |
| **Theme**          | Every colour, radius, and typographic value; resolves a dotted path to a class string.                 | `react-ui › bindTheme`, `defaultTheme`, `useThemeContext`; `@dxos/ui-theme › mx`, `src/css/theme/*`                                                    | Everything                       |
| **Density**        | `control` heights and hit areas — `lg` (~40px) / `md` (~32px) / `sm` (~28px).                          | `@dxos/ui-types › Density`; `react-ui › DensityProvider`, `useDensityContext`                                                                          | Control, Container, Command      |
| **Elevation**      | Stacking tier: `base` / `positioned` / `toast` / `dialog`; and `SurfaceLevel` `base`/`menu`/`tooltip`. | `@dxos/ui-types › Elevation`, `SurfaceLevel`; `react-ui › ElevationProvider`, `useElevationContext`                                                    | Overlay, Container               |
| **Attention**      | Which surface is "current", and therefore which one actions and shortcuts apply to.                    | `react-ui-attention › AttentionProvider`, `AttentionGlyph`, `ViewStateProvider`, `src/core/backends.ts`                                                | Container, Article, Command      |
| **Focus**          | Where the DOM focus is, and how a focused thing shows it.                                              | `react-ui › Focus`; `@dxos/ui-theme › dx-ring-pseudo`, `focus-visible:` variants                                                                       | Control, Collection, Overlay     |
| **Keyboard nav**   | Arrows / Tab / Escape traversal within a surface; roving tabindex.                                     | `react-ui-attention › useArticleKeyboardNavigation`; per-component in `react-ui-list` (`Listbox`/`Tree`/`Treegrid`), `react-ui-grid`, `react-ui-table` | Collection, Command, Navigation  |
| **Key bindings**   | Named commands bound to chords, owned by a surface rather than the app.                                | `react-ui-editor` keymaps; `react-ui-thread › command.ts`; `@dxos/ui-editor`                                                                           | Text surface, Conversation       |
| **Selection**      | Which items are chosen; single vs multi vs range.                                                      | No single owner — implemented per family in `react-ui-list`, `-table`, `-grid`, `-mosaic`, `-canvas*`, `-form`. **Least consistent aspect.**           | Collection, Arrangement, Spatial |
| **Hover**          | Revealing secondary controls on pointer-over, without layout shift.                                    | `@dxos/ui-theme › src/fragments/hover.ts` (`hoverableControls`, `--controls-opacity`, `hover-hover:` variants)                                         | Collection, Card, Toolbar        |
| **Modality**       | Whether a surface blocks the rest of the UI, and how it degrades on small screens.                     | `react-ui › Dialog`, `Popover`, `Menu`; `Main`'s sidebars become `DialogContent` below `lg`                                                            | Overlay, Navigation              |
| **Scrolling**      | Overflow, the flex height chain that enables it, and pin-to-bottom behaviour.                          | `react-ui › ScrollArea`, `ScrollContainer`; `@dxos/ui-theme › dx-expander`/`dx-container` (`src/css/utilities.css`)                                    | Scroll surface, Container        |
| **Virtualization** | Rendering a window over a long collection, and following its tail.                                     | `react-ui-virtual › Window`, `follow`, `list-model`, `placement`; `react-ui-mosaic › VirtualStack`                                                     | Collection, Conversation         |
| **Drag & drop**    | Picking up, indicating a target, and resolving a drop to a model change.                               | `react-ui-dnd › Root`, `resolve-drop`, `ResizeHandle`; `react-ui-list › DropIndicator`; `react-ui-mosaic › DragHandle`, `Placeholder`                  | Arrangement, Collection          |
| **Composition**    | Whether a component becomes its child (`asChild`) or renders its own element.                          | `react-ui › slottable`, `composable`, `composableProps` (`src/util/slots.ts`); `dx-slot-warning`                                                       | Everything                       |
| **Sizing**         | The size ramp for icons and controls, and rail-item alignment.                                         | `@dxos/ui-types › Size`; `--dx-rail-item`, `--dx-rail-size`, `--dx-control-*`                                                                          | Control, Display, Column         |
| **Anchoring**      | Positioning against a trigger, collision avoidance, and viewport insets.                               | `@dxos/ui-types › anchor.ts` (`DX_ANCHOR_ACTIVATE`, `side`); `react-ui › useSafeCollisionPadding`, `useSafeArea`, `useVisualViewport`                  | Overlay, Composite control       |
| **Orientation**    | Which axis a component runs along.                                                                     | `@dxos/ui-types › axis.ts`; `orientation` props on `ScrollArea`, `Splitter`, `Mosaic.Stack`, `MasterDetail`                                            | Layout, Collection, Arrangement  |
| **Palette**        | Per-item chromatic identity, distinct from semantic theme colour.                                      | `@dxos/ui-types › palette.ts` (`ChromaticPalette`); `data-hue` attribute                                                                               | Display, Collection, Spatial     |
| **Translations**   | User-visible strings, resolved by key and namespace.                                                   | `react-ui › useTranslationsContext`; per-package `translations.ts`                                                                                     | Everything user-visible          |
| **Async state**    | Pending, streaming, and empty states.                                                                  | `react-ui › Skeleton`, `Deferred`; `react-ui-components › Spinner`, `Shimmer`; `react-ui-list › Empty`                                                 | Collection, Conversation         |
| **Error state**    | What a surface shows when its subtree throws.                                                          | `react-ui › ErrorFallback`                                                                                                                             | Container, Provider              |
| **Disabled**       | Non-interactive presentation, distinguishing static from data-driven.                                  | `@dxos/ui-theme › src/fragments/disabled.ts` (`staticDisabled`, `dataDisabled`)                                                                        | Control, Command                 |
| **Platform**       | Touch vs pointer, mobile layout mode, safe areas.                                                      | `react-ui › src/util/mobile.ts`, `useSafeArea`; `hover-hover:` media variants                                                                          | Container, Overlay, Navigation   |

### Aspects that are named but not yet owned

- **Selection** has no shared model. Six families implement it independently, with different prop
  names and different multi-select semantics. Any attempt to describe a surface declaratively runs
  into this first.
- **Voice control** appears in the construct list but exists only as capture and transcription
  (`react-ui-transcription`, `react-ui-audio`) — there is no command grammar and no voice-driven
  focus or activation.
- **Key bindings** are per-surface, with no registry, so there is no way to enumerate what a chord
  does in a given context, or to detect a collision between two surfaces.

## 3. Data primitives

A template is only useful if it can be _bound_. This table names the things a node binds to — the
value types on the other side of a `data-*` or `state-*` attribute. Each is a real type in the
repo, not a DSL invention.

Two columns carry the weight. **Cardinality** says whether the binding yields one thing or many,
which decides what kinds can consume it. **Resolution** says when the value is available, which
decides whether the consuming node needs an absent state — every `async` row implies one.

| Tag          | Primitive         | What it is                                                                                                           | Where                                                           | Cardinality | Resolution      | Bound by                                         |
| ------------ | ----------------- | -------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- | ----------- | --------------- | ------------------------------------------------ |
| `schema`     | **Schema**        | The shape and meaning of an object. An Effect Schema plus DXOS type annotations.                                     | `@dxos/echo › Type`, `Schema`                                   | one         | static          | `form`, `collection` (columns), `control`        |
| `object`     | **Object**        | One live ECHO entity, addressed by DXN. Mutations are reactive.                                                      | `@dxos/echo › Obj`, `DXN`                                       | one         | reactive        | `form`, `container`, `surface`                   |
| `ref`        | **Ref**           | A typed pointer to an object that may not be loaded yet. **The reason the absent state (`show`/`fallback`) exists.** | `@dxos/echo › Ref` (`Ref.target`, `Ref.atom`)                   | one         | async, reactive | anything that takes `object`                     |
| `query`      | **Query**         | A filter plus order over a database; yields a live array.                                                            | `@dxos/echo › Query`, `Filter`, `QueryResult`                   | many        | async, reactive | `collection`, `arrangement`, `composite_control` |
| `view`       | **View**          | A query _plus_ a field projection and order — what a form or table should actually show.                             | `@dxos/echo › View`; `@dxos/schema › projection`, `ViewModel`   | many        | async, reactive | `form`, `collection`                             |
| `feed`       | **Feed**          | An append-only stream of immutable objects; ordered by insertion, not by query.                                      | `@dxos/echo › Feed`, `Queue`                                    | many        | async, reactive | `conversation`, `collection`                     |
| `space`      | **Space**         | The database a binding resolves against; the scope for queries and creates.                                          | `@dxos/echo › Database`; `Obj.getDatabase`                      | one         | reactive        | ambient — rarely bound explicitly                |
| `graph_node` | **AppGraph node** | A node in the navigation graph: id, label, icon, actions, children.                                                  | `@dxos/app-graph › AppGraphNode`, `AppGraph`                    | one or many | async, reactive | `navigation`, `command`                          |
| `capability` | **Capability**    | A host-provided service or contribution, resolved by token rather than by data.                                      | `@dxos/app-framework › useCapabilities`                         | one or many | reactive        | `surface`, `provider`, `command`                 |
| `operation`  | **Operation**     | A named, keyed, invocable action — the only primitive that _writes_. The sink for every event.                       | `@dxos/app-framework › Operation` (`org.dxos.operation.*` keys) | one         | invoked         | every `on-*` binding                             |
| `atom`       | **Atom**          | A reactive cell. The substrate the others are observed through, not usually bound directly.                          | `effect/unstable/reactivity/Atom`; `Ref.atom`                   | one         | reactive        | internal                                         |

### Notes

- **`ref` vs `object` is the distinction that matters most in practice.** `ProjectArticle` resolves
  three refs (`instructions`, `taskSet`, `outline`) and each needs its own not-yet-loaded branch. A
  template language that treats a ref as an object will render empty sections on every cold load.
- **`view` is what forms should bind to, and mostly don't.** `Form` today takes a schema plus values;
  the projection (which fields, in what order, with what formats) is a separate concern that `View`
  already models. Binding forms to `view` rather than `schema` is what would let field order be data.
- **`operation` is the only writer.** Every other row is read-only from the template's point of view.
  That asymmetry is why events deserve a separate binding family rather than being "just another
  attribute".
- **There is no `selection` primitive**, and there should be. Six component families implement
  selection independently (see the audit). Until it is one type, no template can bind two components
  to the same selection.

## 4. Audit

Every component exported by the `@dxos/react-ui*` family, mapped to a kind. 182 rows across 42
packages. Generated by walking each package's `src/components/<Name>/` and `src/<Name>/`
directories; `*` marks a component under `src/primitives/` rather than `src/components/`.

The point of the audit is to test Table 1: a kind that catches nothing is dead weight, and a
component that fits nowhere means the taxonomy is short a row. Findings follow the table.

| Package                       | Component               | Tag                 |
| ----------------------------- | ----------------------- | ------------------- |
| `react-ui`                    | `Avatars`               | `display`           |
|                               | `Banner`                | `container`         |
|                               | `Breadcrumb`            | `navigation`        |
|                               | `Button`                | `control`           |
|                               | `Calendar`              | `composite_control` |
|                               | `Card`                  | `container`         |
|                               | `Carousel`              | `arrangement`       |
|                               | `Clipboard`             | `provider`          |
|                               | `Column`                | `layout`            |
|                               | `Container *`           | `layout`            |
|                               | `DatePicker`            | `composite_control` |
|                               | `Deferred`              | `provider`          |
|                               | `DensityProvider *`     | `provider`          |
|                               | `Dialog`                | `overlay`           |
|                               | `ElevationProvider *`   | `provider`          |
|                               | `ErrorFallback`         | `provider`          |
|                               | `Flex *`                | `layout`            |
|                               | `Focus`                 | `provider`          |
|                               | `Grid *`                | `layout`            |
|                               | `Icon`                  | `display`           |
|                               | `Image`                 | `display`           |
|                               | `Input`                 | `control`           |
|                               | `Link`                  | `control`           |
|                               | `Main`                  | `container`         |
|                               | `MediaPlayer`           | `time_based`        |
|                               | `Menu`                  | `command`           |
|                               | `Panel`                 | `container`         |
|                               | `Popover`               | `overlay`           |
|                               | `Progress`              | `display`           |
|                               | `ScrollArea`            | `scroll`            |
|                               | `ScrollContainer`       | `scroll`            |
|                               | `Select`                | `control`           |
|                               | `Separator`             | `display`           |
|                               | `Skeleton`              | `display`           |
|                               | `Slider`                | `control`           |
|                               | `Splitter`              | `layout`            |
|                               | `Stepper`               | `navigation`        |
|                               | `Tag`                   | `display`           |
|                               | `TextCrawl`             | `display`           |
|                               | `ThemeProvider *`       | `provider`          |
|                               | `Toast`                 | `overlay`           |
|                               | `Toolbar`               | `command`           |
|                               | `Tooltip`               | `overlay`           |
| `react-ui-assistant`          | `ChatThread`            | `conversation`      |
|                               | `MessageChrome`         | `conversation`      |
| `react-ui-attention`          | `AttentionGlyph`        | `display`           |
|                               | `AttentionProvider`     | `provider`          |
|                               | `ViewStateProvider`     | `provider`          |
| `react-ui-audio`              | `Oscilloscope`          | `time_based`        |
| `react-ui-board`              | `Board`                 | `arrangement`       |
|                               | `Chain`                 | `spatial_surface`   |
| `react-ui-calendar`           | `Calendar`              | `collection`        |
| `react-ui-canvas`             | `Canvas`                | `spatial_surface`   |
|                               | `CellGrid`              | `spatial_surface`   |
|                               | `FPS`                   | `display`           |
|                               | `Grid`                  | `spatial_surface`   |
| `react-ui-canvas-compute`     | `DiagnosticOverlay`     | `display`           |
| `react-ui-canvas-editor`      | `Canvas`                | `spatial_surface`   |
|                               | `Editor`                | `spatial_surface`   |
|                               | `GraphCanvas`           | `spatial_surface`   |
|                               | `KeyboardContainer`     | `provider`          |
|                               | `TextBox`               | `control`           |
|                               | `Toolbar`               | `command`           |
|                               | `UI`                    | `command`           |
| `react-ui-card`               | `Avatar`                | `display`           |
|                               | `CardTile`              | `container`         |
|                               | `Row`                   | `container`         |
| `react-ui-chat`               | `ChatDialog`            | `overlay`           |
|                               | `ChatEditor`            | `text_surface`      |
|                               | `ChatStatus`            | `display`           |
|                               | `ChatStatusIndicator`   | `display`           |
| `react-ui-components`         | `AnimatedBorder`        | `display`           |
|                               | `HtmlViewer`            | `text_surface`      |
|                               | `Matrix`                | `display`           |
|                               | `NumericTabs`           | `navigation`        |
|                               | `ProgressMeter`         | `display`           |
|                               | `QueryEditor`           | `text_surface`      |
|                               | `QueryForm`             | `form`              |
|                               | `Shimmer`               | `display`           |
|                               | `Spinner`               | `display`           |
|                               | `TextBlock`             | `text_surface`      |
|                               | `Timeline`              | `time_based`        |
|                               | `TogglePanel`           | `container`         |
|                               | `Waveform`              | `time_based`        |
| `react-ui-dashboard`          | `Dashboard`             | `arrangement`       |
| `react-ui-debug`              | `Logger`                | `display`           |
| `react-ui-diagram`            | `Diagram`               | `spatial_surface`   |
| `react-ui-dnd`                | `ResizeHandle`          | `control`           |
| `react-ui-editor`             | `Editor`                | `text_surface`      |
|                               | `EditorMenuProvider`    | `provider`          |
|                               | `EditorPreviewProvider` | `provider`          |
|                               | `EditorToolbar`         | `command`           |
| `react-ui-experimental`       | `Blob`                  | `display`           |
|                               | `Chaos`                 | `display`           |
|                               | `Flock`                 | `display`           |
|                               | `Ghost`                 | `display`           |
|                               | `Knot`                  | `display`           |
|                               | `Kube`                  | `display`           |
|                               | `Morph`                 | `display`           |
|                               | `Pulse`                 | `display`           |
|                               | `Sine`                  | `display`           |
|                               | `Text`                  | `display`           |
| `react-ui-feed`               | `Block`                 | `conversation`      |
|                               | `MessageList`           | `conversation`      |
|                               | `Minimap`               | `navigation`        |
|                               | `Outline`               | `navigation`        |
| `react-ui-form`               | `FieldEditor`           | `form`              |
|                               | `Form`                  | `form`              |
|                               | `ObjectForm`            | `form`              |
|                               | `ObjectPicker`          | `composite_control` |
|                               | `ObjectProperties`      | `form`              |
|                               | `ObjectTree`            | `collection`        |
|                               | `RefEditor`             | `composite_control` |
|                               | `ViewEditor`            | `form`              |
| `react-ui-gameboard`          | `Chessboard`            | `spatial_surface`   |
|                               | `Gameboard`             | `spatial_surface`   |
| `react-ui-geo`                | `Globe`                 | `spatial_surface`   |
|                               | `Map`                   | `spatial_surface`   |
|                               | `Toolbar`               | `command`           |
| `react-ui-graph`              | `Graph`                 | `spatial_surface`   |
|                               | `Mesh`                  | `spatial_surface`   |
|                               | `SVG`                   | `spatial_surface`   |
|                               | `Tree`                  | `spatial_surface`   |
| `react-ui-grid`               | `CellEditor`            | `control`           |
|                               | `Grid`                  | `collection`        |
| `react-ui-introspect`         | `Picker`                | `composite_control` |
|                               | `ToolForm`              | `form`              |
|                               | `ToolList`              | `collection`        |
|                               | `ToolResults`           | `display`           |
|                               | `ToolsExplorer`         | `collection`        |
| `react-ui-list`               | `Accordion`             | `collection`        |
|                               | `Combobox`              | `composite_control` |
|                               | `DropIndicator`         | `display`           |
|                               | `Empty`                 | `display`           |
|                               | `Listbox`               | `collection`        |
|                               | `MasterDetail`          | `collection`        |
|                               | `OrderedList`           | `collection`        |
|                               | `Picker`                | `composite_control` |
|                               | `Tree`                  | `collection`        |
|                               | `Treegrid`              | `collection`        |
| `react-ui-markdown`           | `MarkdownStream`        | `text_surface`      |
|                               | `MarkdownView`          | `text_surface`      |
| `react-ui-masonry`            | `Masonry`               | `arrangement`       |
| `react-ui-mcp`                | `ToolForm`              | `form`              |
|                               | `ToolList`              | `collection`        |
| `react-ui-menu`               | `ActionLabel`           | `display`           |
|                               | `DropdownMenu`          | `command`           |
|                               | `Menu`                  | `command`           |
|                               | `ToolbarMenu`           | `command`           |
| `react-ui-mosaic`             | `Board`                 | `arrangement`       |
|                               | `Focus`                 | `provider`          |
|                               | `Mosaic.Container`      | `arrangement`       |
|                               | `Mosaic.Tile`           | `container`         |
|                               | `Mosaic.Stack`          | `arrangement`       |
|                               | `Mosaic.VirtualStack`   | `arrangement`       |
|                               | `Mosaic.DragHandle`     | `control`           |
|                               | `Mosaic.ResizeHandle`   | `control`           |
|                               | `Mosaic.Placeholder`    | `display`           |
|                               | `Mosaic.DropIndicator`  | `display`           |
|                               | `SearchStack`           | `collection`        |
| `react-ui-pickers`            | `EmojiPicker`           | `composite_control` |
|                               | `HuePicker`             | `composite_control` |
|                               | `IconPicker`            | `composite_control` |
|                               | `PickerButton`          | `composite_control` |
| `react-ui-rdf`                | `FactViewer`            | `collection`        |
| `react-ui-search`             | `Highlighted`           | `display`           |
|                               | `SearchList`            | `composite_control` |
|                               | `SearchPanel`           | `container`         |
| `react-ui-syntax-highlighter` | `JsonHighlighter`       | `text_surface`      |
|                               | `Syntax`                | `provider`          |
|                               | `SyntaxHighlighter`     | `text_surface`      |
| `react-ui-table`              | `Table`                 | `collection`        |
|                               | `TableCellEditor`       | `control`           |
| `react-ui` (`Tabs`)           | `Tabs`                  | `navigation`        |
| `react-ui-task`               | `TaskList`              | `collection`        |
| `react-ui-terminal`           | `Terminal`              | `text_surface`      |
| `react-ui-thread`             | `Message`               | `conversation`      |
|                               | `Thread`                | `conversation`      |
| `react-ui-transcription`      | `MicSettings`           | `form`              |
|                               | `PipelineStatus`        | `display`           |
|                               | `Transcription`         | `time_based`        |
| `react-ui-virtual`            | `Window`                | `scroll`            |

### Distribution

| Tag                 |   n | Tag            |   n |
| ------------------- | --: | -------------- | --: |
| `display`           |  38 | `command`      |   9 |
| `spatial_surface`   |  16 | `form`         |   9 |
| `collection`        |  16 | `arrangement`  |   8 |
| `provider`          |  14 | `navigation`   |   6 |
| `composite_control` |  12 | `conversation` |   6 |
| `control`           |  11 | `layout`       |   5 |
| `text_surface`      |  10 | `overlay`      |   5 |
| `container`         |   9 | `time_based`   |   5 |
|                     |     | `scroll`       |   3 |

### What the audit revealed

- **`Display` is doing too much — 38 rows, more than twice the next kind.** It currently holds three
  unrelated groups: genuine leaf presentation (`Icon`, `Image`, `Separator`, `Tag`), generative and
  decorative visuals (all ten of `react-ui-experimental`, plus `Matrix`, `AnimatedBorder`,
  `Shimmer`), and runtime instrumentation (`FPS`, `Logger`, `DiagnosticOverlay`, `PipelineStatus`).
  A kind that catches a fifth of the corpus is not carrying information.
- **`Spatial surface` is the second-largest kind and spans four unrelated engines** — tldraw-style
  canvas, force-directed graph, geographic projection, and game board. They share a coordinate
  space and nothing else. Whether that is one kind or four is a real question.
- **Only three `Scroll surface` components exist**, yet the scroll/height-chain aspect is the one
  most often got wrong in plugin code. The kind is small because the concern is delegated to
  `ScrollArea` rather than re-implemented — which is the intended outcome, and worth stating.
- **Name collisions across packages are common**: `Grid` is a Layout primitive in `react-ui`, a
  Spatial surface in `react-ui-canvas`, and a Collection in `react-ui-grid`. `Toolbar`, `Tree`,
  `Board`, `Picker`, `Editor`, `Calendar`, `ToolForm`, and `ToolList` each appear in two or more
  packages with different kinds. Any declarative dialect referring to components by bare name will
  be ambiguous; references need the package.
- **`react-ui-mcp` duplicates `react-ui-introspect`** — both export `ToolForm` and `ToolList`, in the
  same kinds. Likely one should absorb the other.
- **Two components are kinded by their own admission rather than their name**: `Syntax` is a
  headless provider despite sitting in a rendering package, and `KeyboardContainer` is a provider
  despite the name suggesting a container.

## 5. Rules

Observations that survived contact with the code, written as rules so they can be cited and
argued with. Each one names the evidence that produced it; a rule with no evidence is a
preference, and does not belong here.

Rules are numbered for reference (`R-1`) and stable — a rule that turns out to be wrong is struck
through with a note, never renumbered.

### Binding

**R-1 — A layout template is bound to a state object, and parameterized by that object's type.**
A template is not a picture; it is a function from state to structure. The state object is the
single root that every `data-*` binding in the template resolves against, and its type is the
template's type parameter. Without the parameter, a template is a set of unchecked string paths.

_Evidence:_ every real container resolves from one subject — `ProjectArticle` takes
`subject: Project` and reaches `subject.instructions`, `subject.taskSet`, `subject.artifacts`.
_Consequence:_ `<Layout<{ title: string }>>` is the correct shape. The binding root is named
(`context`, `subject`) and typed; paths are checked against it.
_Update (2026-08-29):_ landed in `ui-template` as the root `var` signature: the template declares
its typed inputs (`<var name="…" type="…" many optional />`), the host's values are validated
against it at mount, and there is no untyped state object — resolution is closed over declared
names (`let`/`var`/`use`), so an undeclared first segment is a parse error. See
[`DESIGN.md`](./DESIGN.md) § Typed binding and modules.

**R-2 — Every asynchronous binding implies an absent state on the consuming node.**
A `ref`, `query`, `view`, or `feed` may not be loaded. If the template cannot say what to render
in that window, the component will render as though the data were empty.

_Evidence:_ §3 marks five primitives `async` (`ref`, `query`, `view`, `feed`, `graph_node`). `ProjectArticle` guards three resolved refs, and its
own comments record that a synchronous `.target` read leaves sections "permanently missing" on a
cold load.
_Consequence:_ the absent state must be sayable in the template. The `ui-template` spike says it
structurally: a `show`/`fallback` pair renders one branch by the presence of a single `when`
binding, so the window where data is not loaded has explicit content rather than an implicit blank.

**R-3 — Only `operation` writes; every other primitive is read-only to a template.**
Templates describe. The single outbound edge is an event bound to an operation key.

_Evidence:_ §3 — ten read primitives, one invocable.
_Consequence:_ events are a distinct binding family, not an attribute that happens to hold a
function. It also means a template can be statically checked for what it can change: the set of
operation keys it names.
_Update (2026-08-29):_ the rule gains an owner clause under the module contract: only the
_owning module's_ operation writes its state — a module operation's `scope` covers exactly its
own slots (a foreign write throws), and cross-module interaction is dispatching the other
module's operations. See [`DESIGN.md`](./DESIGN.md) § The module contract.

**R-4 — Per-instance UI state is its own binding family.**
The state a template needs that is neither persisted data nor host context — a selected tab, an
expanded row, a draft filter — has no home in a data/state/event split.

_Evidence:_ the ProjectArticle draft required an invented `$local.tab`; the real component holds it
in `useState`, and `onSelectTask` sets it.
_Consequence:_ either the DSL grows a fourth read family, or every such value is promoted to a real
object — which makes tab selection a database write.
_Update (2026-08-29):_ the `ui-template` spike answers this with **published state under lexical
scopes**: an element declaring `id` opens a scope, its `let` children declare slot names published
at `ui.<idPath>.<name>`, written only by scope-relative operations and read through ordinary
`data-` bindings resolved lexically — a third option neither anticipated. Publication requires the
name; anonymous elements stay private. The `let` backing is a ladder — a literal `initial=`
value, a registry `machine=`, or `from=` a module-provided shared instance (written only by the
owning module's operations). See [`DESIGN.md`](./DESIGN.md).

**R-5 — Forms bind to a view, not to a schema.**
A schema gives shape. Which fields appear, in what order, with what formats, is a projection — and
that is a separate primitive that already exists.

_Evidence:_ `@dxos/echo › View` plus `@dxos/schema › projection`/`ViewModel` model exactly this;
`Form` today takes schema plus values, so field order is code.
_Consequence:_ binding forms to `view` is what makes layout data rather than markup.

### Naming and addressing

**R-6 — Tags name kinds, not components.**
A template that names `Listbox` is a React template. A template that names `collection` is not.

_Evidence:_ Goal 1 — [`solid-ui-geo`](../../solid-ui-geo) and [`lit-grid`](../../lit-grid) are
working non-React implementations of components in this family.
_Consequence:_ `component=` exists as an escape hatch for when a specific implementation is
genuinely required, mirroring how `surface` in the app dialect takes a role first.

**R-7 — Components are addressed by package and name, never by name alone.**
_Evidence:_ the audit — `Grid` is a `layout` in `react-ui`, a `spatial_surface` in
`react-ui-canvas`, and a `collection` in `react-ui-grid`. `Toolbar`, `Tree`, `Board`, `Picker`,
`Editor`, `Calendar`, `ToolForm`, and `ToolList` each recur across packages under different kinds.
_Consequence:_ any `component=` value is package-qualified.

**R-8 — A tag outside the table is an error, not a no-op.**
_Evidence:_ the closed-vocabulary goal; a silently dropped element renders as though the author
never wrote it.
_Consequence:_ the parser reports the unknown tag and its position, and refuses the document.

**R-9 — Kinds are too coarse to be tags on their own.**
Seventeen kinds cannot distinguish a tab bar from a breadcrumb, or a masonry from a carousel.

_Evidence:_ the ProjectArticle draft needed `<navigation kind="tabs">` and
`<arrangement kind="masonry">` within four lines of each other.
_Consequence:_ either a second discriminator is part of the grammar, or the tag set is finer than
the kind set. **Open.**

**R-10 — Parts are a vocabulary distinct from kinds.**
`Panel.Toolbar`, `Form.Section`, `Tabs.Button` are not kinds; they are named positions within one.

_Evidence:_ the draft used `<item>`, `<action>`, `<field>`, `<row>`, `<tile>`, `<section>`,
`<slot>`, `<separator>` — none of which is one of the 17.
_Consequence:_ a schema cannot validate which children a node admits until parts are enumerated.
**Open — no parts table exists.**

### Structure and logic

**R-11 — A template expresses structure, not sequence.**
Anything with a step, a result, or a branch on a result is not layout.

_Evidence:_ `ProjectArticle`'s add-artifact flow invokes a form operation, checks whether the user
dismissed it, and only then splices the returned ref; create-chat sequences three invocations plus
a non-operation call.
_Consequence:_ adopting a template language means writing those as named operations first. The
logic is relocated, not removed.

**R-12 — An aspect must be extractable, or it is not an aspect.**
If a concern cannot be lifted out of the components that implement it, naming it in Table 2
describes a coincidence rather than a shared mechanism.

_Evidence:_ density and elevation are context plus hook and are genuinely shared; selection is
implemented six times with different prop names and different multi-select semantics.
_Consequence:_ `selection` is not yet an aspect. It is a name for six things.

**R-13 — A kind must be definable without reference to a framework.**
If the only way to say what something is involves hooks, context, or JSX, the definition is of an
implementation.

_Evidence:_ Goal 1.
_Consequence:_ Table 1's "what defines it" column mentions no React concept, and should stay that
way.

**R-14 — Layout escape hatches must be expressible.**
A declarative layer that cannot say "not that way, it breaks" will silently regress the
workarounds the imperative code earned.

_Evidence:_ `ProjectArticle` hand-rolls its tab switching because Radix `Tabs.Panel` mounts hidden
for a frame and masonry measures zero there; it omits `Masonry.Content` because `Form.Viewport`
already scrolls.
_Consequence:_ **Open.** Neither workaround has a declarative form today.

### Tooling

**R-15 — The surface syntax must be valid in its own format.**
If the reason for choosing XML is free editor, schema, and formatter support, then a grammar that
those tools reject has given up the only reason to choose it.

_Evidence:_ `on:activate` fails XML validation — an undeclared namespace prefix — the first time a
real editor sees it.
_Consequence:_ prefixes are hyphenated (`on-activate`), or namespaces are declared, or the format
is not XML.

## Appendix: canonical references

External sources this ontology should stay legible against. Where our vocabulary diverges from a
canonical one, that is a decision to make explicitly rather than by accident.

### Standards and accessibility

| Reference                              | Why it matters here                                                                                                                                                | URL                                 |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------- |
| **WAI-ARIA Authoring Practices (APG)** | The canonical taxonomy of widget patterns and their keyboard interaction. The closest existing analogue to Table 1, and the reference for the Keyboard-nav aspect. | https://www.w3.org/WAI/ARIA/apg/    |
| **WAI-ARIA 1.2**                       | The role taxonomy itself — `listbox`, `tree`, `grid`, `toolbar`, `dialog` are roles before they are our kinds.                                                     | https://www.w3.org/TR/wai-aria-1.2/ |
| **ARIA in HTML**                       | Which roles a native element already carries; governs when a `role` prop is redundant or harmful.                                                                  | https://www.w3.org/TR/html-aria/    |
| **WCAG 2.2**                           | Focus visibility, target size, and motion — constraints on the Focus, Sizing, and Density aspects.                                                                 | https://www.w3.org/TR/WCAG22/       |
| **Open UI**                            | Ongoing work to standardise component anatomy and naming; useful as a check on our part names.                                                                     | https://open-ui.org/                |

### Platform design systems

| Reference                            | Why it matters here                                                                                                           | URL                                                           |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| **Apple Human Interface Guidelines** | Platform conventions for modality, navigation hierarchy, and density on touch vs pointer.                                     | https://developer.apple.com/design/human-interface-guidelines |
| **Material Design 3**                | The most fully specified public treatment of elevation, density, and state layers — direct analogues to three of our aspects. | https://m3.material.io/                                       |
| **Android UI (Jetpack Compose)**     | Compose's slot API is the closest mainstream analogue to our `asChild`/`slottable` composition model.                         | https://developer.android.com/develop/ui                      |
| **Microsoft Fluent 2**               | Cross-platform token architecture; a comparison point for our theme token naming.                                             | https://fluent2.microsoft.design/                             |
| **GNOME HIG**                        | Desktop-first patterns for panels, sidebars, and header bars.                                                                 | https://developer.gnome.org/hig/                              |

### Component libraries and prior art

| Reference                   | Why it matters here                                                                                                                            | URL                                  |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| **Radix Primitives**        | The direct ancestor of our composite-component style — `Root`/`Trigger`/`Content` parts, `asChild`, `Slot`. Several of our components wrap it. | https://www.radix-ui.com/primitives  |
| **Zag.js**                  | State machines for widget behaviour, framework-agnostic. The candidate for the behaviour layer in the Scenes design.                           | https://zagjs.com/                   |
| **Ark UI**                  | Zag's component layer; a worked example of separating machine from renderer.                                                                   | https://ark-ui.com/                  |
| **Inclusive Components**    | Pattern-by-pattern accessible implementations; a practical companion to the APG.                                                               | https://inclusive-components.design/ |
| **IBM Carbon**              | A large open design system with published component taxonomy and token structure.                                                              | https://carbondesignsystem.com/      |
| **Shopify Polaris**         | Notable for documenting _when_ to use each component, not just its API.                                                                        | https://polaris.shopify.com/         |
| **Atlassian Design System** | Strong treatment of density and data-dense surfaces.                                                                                           | https://atlassian.design/            |

### Internal

| Reference                                                                                   | What it covers                                                             |
| ------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| [`react-ui/docs/AUDIT.md`](../../react-ui/docs/AUDIT.md)                                    | The wrapper-div census that produced `Flex` and the `Grid` extension.      |
| [`ui-theme/AUDIT.md`](../../ui-theme/AUDIT.md)                                              | Token and surface conformance across `Panel`/`Card`.                       |
| [`.agents/skills/composer-ui/SKILL.md`](../../../../.agents/skills/composer-ui/SKILL.md)    | The authoring rules that follow from this ontology.                        |
| [`deus/lang/app.mdl`](../../../reflect/deus/lang/app.mdl)                                   | The app dialect — `node`, `deck`, `plank`, `companion`, `surface`, `menu`. |
| [`plugin-illustrator/src/model/ui.ts`](../../../plugins/plugin-illustrator/src/model/ui.ts) | The `Ui` schematic dialect that draws from this vocabulary.                |
