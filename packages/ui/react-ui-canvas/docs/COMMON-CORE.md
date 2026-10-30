# Scene editor: one core for 2D and 3D

Status: draft for review, 2026-10-30; all questions answered. Nothing here is built. Supersedes the per-dimension editors that stage 3
produced (`SceneView2D` on react-ui-canvas's own model, `SceneView3D` on `@dxos/scene`).

## Decided by the user (2026-10-30)

1. One data structure for 2D and 3D, with variance only where geometry and camera require it.
2. One editor with common panels; each dimension configures it separately.
3. The editor lives in react-ui-canvas, under its current name ("canvas" is the surface in either dimension).
4. 2D moves fully onto the shared model and edits (`LayoutIntent`, the shared store); react-ui-canvas's own
   `View`/`Node`/`Link` model, `Intent` and `ViewStore` are retired, and its lattice, constrained, dynamic and scored
   modes are ported.
5. Standing rule: every feature is designed for both dimensions first — shared behaviour and shared implementation;
   only the viewport and dimension-specific geometry differ.
6. Styles: one term, **Style**, with typed variants `Style2D` (CSS-like) and `Style3D` (material-like) — the two are
   not conflated. One mechanism: named styles defined in the model, overridden by layouts, referenced by elements by
   id with per-element overrides, and resolved through shared **style catalogs** (custom catalogs as ECHO objects;
   themes as the default catalogs).

7. (2026-10-30) Every field react-ui-canvas records carry today (ports, path/polyline points, view and portal links,
   z order, lattice cells, constraint and dynamic models, generators, diagram shapes) becomes a typed field
   of `Element2D` (or `Layout2D` where it belongs to the layout), not an untyped `props` entry.
8. (2026-10-30) Gestures stay in memory while they run (drag, resize, rotate, orbit, drag-to-create) and commit one
   intent on release, in both dimensions, so editing is smooth on ECHO.
9. (2026-10-30) Work stays in one PR: get the basics working, then focus on tests and storybooks to review each
   aspect.

10. (2026-10-30) react-ui-canvas-compute (and plugin-conductor through it) moves onto the shared model and editor in
    this work too: one data structure everywhere, no frozen copy of the old model.

11. (2026-10-30) One text language and one data model for diagrams: `.dx` semantic statements (`diagram`/`node`/`edge`/
    `group`) and scene statements (`scene`/`layout`/`model`/`element`) both target `@dxos/scene`. The layout engines
    output `Layout2D` elements and model objects as one `LayoutIntent` batch, each element keeping its DSL identity in
    a typed field; `@dxos/diagram`'s own scene model (objects of Box/Circle/Polyline/Curve/Arc/Text/Arrow/Portal and
    its Upsert/Remove/Move commands) is retired as a data model, the illustrator's SVG renderer draws `Layout2D`, and
    the canvas builder's translation layer disappears. This is step 0, before 2D's data moves.

12. (2026-10-30) The element schema is re-based on react-ui-canvas's **current** schema (`src/model/types.ts`:
    `nodeBase`, node types, `NodeStyle`, links, `source`/`target` endpoints `{ node, port } | { point }`, ports, spline
    points, connectors, view and instance nodes), keeping its field names and shapes (`type`, `z`, …). Only what the user
    decided changes: one element type for nodes **and** links (a link is an element with endpoints); a named `style`
    reference (today's `class`) plus `overrides` (today's inline `style`), with `Style2D`/`Style3D` and catalogs; and
    the Model/Layout/Scene split. `Element3D` shares the same base, so 3D adopts the canvas names (`type`, `z`,
    endpoints, ports). `@dxos/scene`'s current `kind`, `order`, `from`/`to` `Binding`, `members` and shared `Style`
    tokens are replaced, with no aliases; the 3D code, `.dx` scene statements, exemplars and stages follow.
13. (2026-10-30) Plugin-defined kinds extend the element schema exactly as today
    (`Schema.Struct({ ...elementBase, type: Schema.Literal('class'), …own fields })`) and register in the kind registry;
    a layout's `elements` store validates the shared base and preserves unknown fields, and the registry validates each
    kind's own fields.
14. (2026-10-30) Constrained and dynamic models are normalised onto the layout's elements (constraints reference
    element ids; graph edges are link elements; overlay positions are element centers). The canvas timeline is a typed
    `Layout2D` field now; moving it to an animator shot is a follow-up. The 2D viewport gets new draw code for diagram
    `arc`, free `curve` and open `polyline` elements.
15. (2026-10-30, recommended, pending user confirmation) Diagram object frames: reuse plugin-canvas `SceneHandler`'s
    existing translation (objects flattened to absolute canvas elements, `origin`/`scale` baked in, ids
    `object/element`). Diagram styles: kept as today — `diagram` nodes and link `connector`s keep the diagram vocabulary
    (`color`/`fill`/`stroke`/`weight`); plain nodes map it onto `NodeStyle`; `Style2D` is `NodeStyle`.

16. (2026-10-30) **One animation system.** `@dxos/animation`'s `Timeline` is the only timeline model, owned by
    plugin-animator's `Shot` (a shot stages a scene with a timeline and effects; sampled, never written — D-28).
    react-ui-canvas's own timeline (`model/timeline.ts`, `sampleView`, `sampleCamera`, the per-View timeline field) is
    retired. A shared **Timeline panel** in `SceneEditor` (2D and 3D) lists and plays the shots staging the open scene,
    keyframes the selected elements and the camera, and creates a shot when none exists. Existing 2D timeline data
    migrates into a shot over the migrated scene, its keys rewritten to element paths. Supersedes decision 14's
    "timeline as a typed `Layout2D` field".
17. (2026-10-30) 3D groups become composites placed by `instance` elements, as in 2D; the ring and grid arrangers move
    onto composites; the 3D-only `members`/`arrange` fields are removed; the `.dx` reader/printer map the existing group
    text onto composites (no grammar change).

18. (2026-10-30) **Composites with relative positioning, both dimensions.** A composite is a model object whose
    `parts` layout is in local units; the placing `instance` element carries the transform — `object`, `center` (local
    origin), `scale?` (2D: number or `Vec2`, local units → canvas px; 3D: `Vec3`), `rotation?`, `fit?: 'none' |
'frame'` (`frame` = today's fit-to-frame for portal views, D-13; `none` = scale as given). Parts draw at
    `center + rotation·scale·local`, with strokes and text scaled too. Diagram objects become composites placed by
    instances (one element per object; `MoveObject` moves the instance); plugin-canvas `SceneHandler`'s flattening is
    dropped. Canvas composite/instance nodes gain the explicit transform; 3D groups (decision 17) use the same
    mechanism. The SVG renderer and both viewports draw parts through the instance transform. Supersedes decision 15's
    object-frame approach.
19. (2026-10-30) **One 2D style vocabulary now.** `Style2D` = canvas `NodeStyle` extended with `lineStyle: 'sketchy'`,
    `pattern?: boolean` and `weight?: 's' | 'm' | 'l' | 'xl'` (scales stroke and text). Diagram styles map onto it (see
    the plan's DSL mapping); diagram `color`/`fill`/`stroke`/`weight` fields disappear from elements, so
    diagram-styled elements can take catalog styles. Supersedes decision 15's style approach.
20. (2026-10-30, agent call for the user, pending override) Two theme-independent hues, `black` and `white`, are added
    to the hue list so diagram `black`/`white` map exactly and the corpus metric gate stays stable.

## Expectations (user, 2026-10-30)

0. The shared base editor has the same structure as today's `Canvas`: `SceneEditor.Root` provides one shared context
   split by aspect, with a hook per aspect (as `Canvas` has `useCanvasDocument`, `useCanvasTools`, `useCanvasLook`,
   `useCanvasNavigation`, `useCanvasEditing`); panels and inspectors are composite parts reading those hooks; each
   dimension's `DimensionConfig` supplies its implementations behind the same hooks.
   0a. The work runs phases 0 → A → B → C (order kept) until both editors run on the shared core, delivering storybooks
   for every panel and inspector with 2D and 3D variants (including the new **Styles** inspector, added as a section of the shared inspector panel in both dimensions), storybooks for the
   2D and 3D editors, and storybooks for 2D and 3D animations (the shared Timeline panel over animator shots).

These are the acceptance criteria; any place the work would break one is raised with the user before it is built.

1. The canvas data-structure changes are mechanical and map cleanly from the current records to the new types — a
   field-by-field mapping table, checked by round-trip tests.
2. The diagram DSL changes little and maps cleanly onto the new structure — only its output target changes.
3. The shared editor has common components (panels, inspectors, canvas, context menu), common behaviours (cut, copy,
   paste, undo, redo, selection, lock, roles) and pluggable behaviours only where the dimensions truly differ.

## Why

Stage 3 shared leaf components but not the editor. 2D still edits react-ui-canvas records and an adapter translates
each write to `Layout2D`; 3D edits `Layout3D` directly. So there are two intent systems, two stores, two undo
histories, two command paths and two hand-assembled shells (`SceneView2D.tsx`, 436 lines; `SceneView3D.tsx`, 948
lines). Every parity request since has patched the surface of that split.

## Architecture

```
@dxos/scene (data)            Model<O> · Layout<E> · Scene<C> · LayoutIntent · ModelIntent · .dx
        ▲ apply
SceneEditor (react-ui-canvas) Root: store (selection, tool, drill path, history, clipboard) · command table
                              Panels: Tools · Actions · Camera · Display · Inspector · ContextMenu
        ▲ configured by
DimensionConfig               2D: SVG/DOM viewport, Vec2 geometry   ·   3D: Babylon viewport, Vec3 geometry
```

### Data (now the only model)

```ts
type Model<O, S>  = { name?; objects: Record<string, O>; styles: Record<string, S>; catalogs?: Ref<StyleCatalog>[] }
type Layout<E, S> = { name?; model?; elements: Record<string, E>; layers?; styles?: Record<string, Partial<S>>;
                      lattice?; constraints? }
type Scene<C>     = { name?; theme?; layout; camera: C }          // camera = authored view only (D-47)

// The shared base: react-ui-canvas's nodeBase/linkBase, names kept (decision 12).
elementBase = { id; type; z; locked?; layer?; label?; text?; style?: string /* was class */; object?;
                ports?: Port[]; portsPerSide?; exposed?;                      // nodes
                source?: Endpoint; target?: Endpoint; ends?; connector? }     // links: an element with endpoints
Endpoint    = { node: string; port?: string } | { point: Vec2 | Vec3 }
Element2D   = elementBase & { center?: Vec2; size?: Size2; rotation?: number; points?: Vec2[];
                              overrides?: Partial<Style2D> /* was style */ } & <type's own fields>
Element3D   = elementBase & { center?: Vec3; scale?: Vec3; rotation?: Vec3; points?: Vec3[];
                              overrides?: Partial<Style3D> } & <type's own fields>
// Instance transform (decision 18): { object; center; scale?; rotation?; fit?: 'none' | 'frame' }
// Plugin kinds: Schema.Struct({ ...elementBase, type: Schema.Literal('class'), ...own }) registered in the kind
// registry (decision 13).
LayoutIntent | ModelIntent                                        // the one edit vocabulary
```

### Styles

```ts
Style2D = NodeStyle & { lineStyle?: … | 'sketchy'; pattern?: boolean; weight?: 's' | 'm' | 'l' | 'xl' }  // decision 19
Style3D = { name?; color?; metalness?; roughness?; opacity?; glass?; emissive?; … }         // material-like
class StyleCatalog /* ECHO */ { name; dim: '2d' | '3d'; styles: Record<string, Style2D | Style3D> }

// One shared resolver; nearest wins.
resolveStyle<S>(element, layout, model, catalogs, defaults): S
//   element.overrides → layout.styles[id] → model.styles[id] → model.catalogs (in order) → default catalog (theme)
```

- `element.style` names a style in either dimension; only what a style contains differs.
- A catalog entry is addressed by catalog and key (`brand:warning`), so equal keys in different catalogs don't
  collide.
- Themes are default catalogs: 2D's theme registry and 3D's CAD/Presentation looks are each a default
  `StyleCatalog`, and the Display panel's theme picker chooses the default catalog in both dimensions.
- The inspector gains a **Styles** section (shared): the drawing's styles, then its catalogs; "New style from
  selection" (today's 2D "new class") works in both dimensions.
- Migration: `@dxos/scene`'s shared `Style` tokens are replaced by `Style2D`/`Style3D` (supersedes D-14);
  react-ui-canvas's `StyleClass` and `Canvas.styles` become `Style2D` entries in `Model.styles`, a node's `class`
  becomes `style`, and its own style fields become `overrides`; 3D's look tokens become `Style3D`.

### Editor

```ts
SceneEditor.Root { document; scene: string; config: DimensionConfig; readonly?; role? }
  SceneEditor.Viewport      // renders config.viewport
  SceneEditor.Tools         // rail: select/hand · transform · create · lock
  SceneEditor.Actions       // bottom centre, from the command table
  SceneEditor.Camera        // bottom left: fit, reset, zoom
  SceneEditor.Display       // bottom right: theme, grid, snap, guides
  SceneEditor.Inspector     // one dockable panel; sections from config
  SceneEditor.ContextMenu   // from the command table

type DimensionConfig = {
  dim: '2d' | '3d';
  viewport: ComponentType<ViewportProps>;   // render + pick + project + gestures → intents
  tools: ToolDef[];                         // categories drive the rail's groups
  geometry: GeometryOps;                    // move/scale/rotate/snap in Vec2 or Vec3
  camera: CameraOps;                        // fit, reset, zoom; per-viewer view state
  display: DisplayOptions;                  // themes (registry), grid kinds, snap step, guides
  sections: InspectorSectionDef[];          // shared sections + dimension-only ones
  propertyForm: Schema.Schema.Any;          // element form with variance
};

type ViewportProps = {
  document: SceneDocument; scene: string; editing: string;   // the layout being edited (drill-in)
  selection: readonly string[]; tool: ToolDef; readonly: boolean;
  onSelect(ids: string[]): void; onIntent(intent: LayoutIntent): void;
  onContextMenu(at: Point, target?: string): void;
};
```

Commands, history, clipboard, selection, lock, roles, panel placement and keyboard handling are written once in the
core. A viewport never writes ECHO and never owns a command; it reports gestures as intents and selection changes.

## Features: shared and per dimension

| Group           | Feature            | Shared (core / data)                                                               | 2D (config)                                 | 3D (config)                                       |
| --------------- | ------------------ | ---------------------------------------------------------------------------------- | ------------------------------------------- | ------------------------------------------------- |
| **Data**        | Document           | `Model`/`Layout`/`Scene`, `SceneDocument`, `.dx` text                              | `Element2D`, `Camera2D`                     | `Element3D`, `Camera3D`                           |
|                 | Elements           | `BaseElement`: kind, object, style, label, layer, links, groups, props             | center `Vec2`, size, rotation °             | center `Vec3`, scale, rotation `Vec3`             |
|                 | Objects and parts  | model objects; composite `parts` layout; placement by `object`                     | `Object2D` (size)                           | `Object3D` (scale; mesh, solid props)             |
|                 | Edits              | `LayoutIntent`, `ModelIntent`, one reducer                                         | move/scale `Vec2`                           | move/scale/rotate `Vec3`; extrude, join, subtract |
|                 | Storage            | ECHO objects, `Canvas`, `CreatedFrom`, migration                                   | scene/2 → Canvas migration                  | —                                                 |
| **Core**        | Store              | selection, tool, hover, drill path                                                 | —                                           | selected face                                     |
|                 | Commands           | one command table (run + enabled)                                                  | —                                           | —                                                 |
|                 | Undo/redo          | canvas-session history over intents; remote edits skipped                          | —                                           | —                                                 |
|                 | Clipboard          | cut, copy, paste, duplicate as `.dx`; lift/flatten across dims                     | paste offset in grid px                     | paste offset on the ground                        |
|                 | Lock and roles     | read-only lock; card/section/slide have no chrome                                  | —                                           | —                                                 |
|                 | Keys               | one keymap; Cmd-drag = hand                                                        | plain D = debug                             | —                                                 |
| **Viewport**    | Rendering          | `Viewport` contract: render, pick, project                                         | SVG/DOM scene layer                         | Babylon renderer                                  |
|                 | Picking            | `pick(point) → { element, point }`                                                 | hit test                                    | ray pick + ground plane                           |
|                 | Selection feedback | focus-colour token                                                                 | frame and handles                           | silhouette, bounding box, face pane               |
|                 | Handles            | emit intents on release                                                            | resize/rotate handles                       | move/rotate/scale gizmos                          |
|                 | Camera             | per-viewer view state; fit, reset, zoom                                            | pan/zoom                                    | orbit/pan/zoom                                    |
|                 | Grid and snap      | toggles, grid kind, snap step                                                      | dots or lines; major grid px                | ground grid; 1 unit, 15°, 0.1                     |
|                 | Guides             | —                                                                                  | lattice guides                              | —                                                 |
| **Tools**       | Rail groups        | select/hand · transform · create (shapes + link) · lock                            | hand pans                                   | hand orbits                                       |
|                 | Select             | click, shift-click, marquee; create tools also select                              | marquee                                     | —                                                 |
|                 | Create             | click = default, drag = size; Escape cancels                                       | drag box                                    | drag base, then height                            |
|                 | Link               | click A then B                                                                     | —                                           | —                                                 |
|                 | Dimension-only     | —                                                                                  | text, polyline, image                       | extrude, face select                              |
| **Panels**      | Placement          | rail left, actions bottom centre, camera bottom left, display bottom right         | —                                           | —                                                 |
|                 | Actions / menu     | from the command table                                                             | —                                           | join, subtract, import, export STL                |
|                 | Inspector          | one dockable panel, section order                                                  | —                                           | —                                                 |
|                 | Properties         | shared form: label, layer, style fields, vectors (sm, end-aligned, hover steppers) | center, size, rotation                      | center, rotation, scale; face (read-only)         |
|                 | Views              | layout tree, drill-in, scenes list                                                 | —                                           | —                                                 |
|                 | Objects            | model objects: place, make object, edit parts                                      | —                                           | import mesh                                       |
|                 | Layers             | `BaseElement.layer`: hide, lock                                                    | —                                           | hide removes from render and pick                 |
|                 | Display            | registry themes, grid, snap                                                        | guides (lattice)                            | CAD/Presentation looks                            |
| **Modes**       | Projections        | —                                                                                  | free, lattice, constrained, dynamic, scored | free                                              |
| **Integration** | Animator           | stages a `Scene`; sampled, never written                                           | 2D stage                                    | 3D stage                                          |
|                 | Assistant          | `ReadScene`/`EditScene` over `.dx`                                                 | —                                           | —                                                 |
|                 | Export             | —                                                                                  | SVG, tldraw/excalidraw conversion           | STL                                               |

## Consumers of react-ui-canvas's own model

Removing react-ui-canvas's `View`/`Node`/`Link` model, `Intent` and `ViewStore` (decision 4) changes every package
that uses them. Inventory (2026-10-30, imports from `@dxos/react-ui-canvas*`):

| Package                 | Files | What it uses                                                                                              | Impact                                                                                                                                                                                                                            |
| ----------------------- | ----- | --------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| plugin-canvas           | 71    | model (21), containers (27), operations (7), samples (7), import (tldraw), types, skills                  | **Large.** The canvas builder/DSL facade, `Apply`/`Patch` operations, legacy migration, tldraw conversion, samples and stories all move to `Layout2D` + `LayoutIntent`; the content facade and layout-writer adapter are deleted. |
| react-ui-canvas-compute | 17    | `View`, `Node`, `Link`, `NodeDef`, `reduceIntent`, `createMemoryStore`, node registry, dynamic projection | **Large.** The compute-graph board is built on the canvas engine; it moves to the shared model and editor (its nodes become element kinds with their own props).                                                                  |
| plugin-conductor        | 5     | `CanvasBoard` from react-ui-canvas-compute                                                                | Follows react-ui-canvas-compute.                                                                                                                                                                                                  |
| plugin-uml              | 5     | `NodeDefSpec`, `NodeType`, `nodeBase`, `NodeViewProps`, `LinesField`                                      | **Medium.** UML shapes are custom node types; the node-type registry becomes an element-kind registry for `Element2D`.                                                                                                            |
| plugin-code             | 5     | `GraphModel`, `GraphEdge`, `LatticeSpec`                                                                  | **Medium.** Code graphs use the lattice layout; follows the lattice port (step 4).                                                                                                                                                |
| plugin-debug            | 1     | node registry and prototypes, memory store, dynamic projection                                            | **Small.** Demo/debug wiring.                                                                                                                                                                                                     |
| plugin-code-graph       | 1     | `react-ui-canvas/scene` types                                                                             | **Small.**                                                                                                                                                                                                                        |
| plugin-projects         | 2     | `Arrangement`, force layout                                                                               | **Small.** Layout utilities only; unaffected if utilities stay.                                                                                                                                                                   |
| react-ui-scene          | 7     | `View`/`Node` (2D view), canvas atoms, `boundsFromPoints`, tool icons, `isHandDrag`                       | **Small.** `Scene2DView` stops adapting to `View`; utilities stay.                                                                                                                                                                |
| tools/autocue           | 3     | camera utilities (`fitBounds`, `interpolateCamera`, `useViewport`)                                        | **None.** Utilities stay.                                                                                                                                                                                                         |

So the model removal touches two large consumers (plugin-canvas, react-ui-canvas-compute → plugin-conductor), two
medium (plugin-uml, plugin-code) and several small ones; geometry/camera/layout utilities stay where they are.

## Order of work

0. **One DSL target.** The semantic diagram engines (semantic, sequence, UML, mermaid) emit `Layout2D` + model objects
   through `LayoutIntent` instead of `@dxos/diagram` `Scene.Command`s; the DSL identity becomes a typed element field;
   the illustrator's SVG renderer (`SceneSvg`, `.dx.svg` export) reads `Layout2D`; plugin-illustrator's draw/convert
   operations and plugin-canvas's builder use it directly. The diagram corpus, snapshots and render-diagrams task are
   the regression suite.

1. **Data parity for 2D.** Inventory every field react-ui-canvas records carry that `Element2D`/`Layout2D` do not
   (ports, points, links to views, lattice cells, constraint and dynamic models, style classes, z order) and give each
   a typed home or a documented `props` key. The `.dx` round trip and the existing 2D samples are the test corpus.
2. **Core skeleton.** `SceneEditor.Root`, store, command table, history and clipboard, built from what 3D has today
   (it already runs on intents), with the panels as configured parts. 3D moves onto it first; its stories must not
   regress.
3. **2D viewport on intents.** react-ui-canvas's renderer and handles become the 2D viewport: they read `Layout2D`
   (+ resolved objects) and emit `LayoutIntent`. The engine's `Intent`, `ViewStore` and projection model are retired.
4. **Modes.** Port lattice, constrained, dynamic and scored onto `Layout2D` + intents (their models live under
   `layout.props`, D-55/T7 precedent).
5. **Retire the split.** Delete `SceneView2D`/`SceneView3D`, the layout-writer adapter and the content facade;
   `SceneArticle` renders `SceneEditor` with the canvas's dimension config.

Each step ends green (tests, typecheck, lint) and browser-checked in both `SceneArticle` stories and the
react-ui-canvas stories; 2D behaviour stays at parity throughout.

## Open questions

None. The stopped frame agent's uncommitted display-panel edits were set aside (2026-10-30), since they assumed the
shared `Style` tokens and 3D-only themes this design replaces.

## Not in scope

Assistant operations (stage 3 phase D) beyond keeping `.dx` the shared text form; new rendering features.
