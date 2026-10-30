# Scene editor: one core for 2D and 3D

Status: draft for review, 2026-10-30. Nothing here is built. Supersedes the per-dimension editors that stage 3
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
type Layout<E, S> = { name?; model?; elements: Record<string, E>; styles?: Record<string, Partial<S>>; props? }
type Scene<C>     = { name?; theme?; layout; camera: C }          // camera = authored view only (D-47)
BaseElement       = { id; object?; kind?; style?: string; label?; layer?; from?; to?; members?; arrange?; props? }
Element2D         = BaseElement & { center?: Vec2; size?: Size2; rotation?: number; overrides?: Partial<Style2D> }
Element3D         = BaseElement & { center?: Vec3; scale?: Vec3; rotation?: Vec3; overrides?: Partial<Style3D> }
LayoutIntent | ModelIntent                                        // the one edit vocabulary
```

2D-only data that today lives in react-ui-canvas records (ports, path points, view/portal links, lattice and
constraint models) moves into `props` under documented keys or into typed fields on `BaseElement` where both
dimensions need it. Deciding each is part of step 1 below.

### Styles

```ts
Style2D = { name?; fill?; stroke?; lineStyle?; fontFamily?; fontSize?; opacity?; … }       // CSS-like
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

## Order of work

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

1. The uncommitted display-panel edits left by the stopped frame agent (3D grid kinds, renderer, styles): keep them
   as the start of step 2, or discard?

## Not in scope

Assistant operations (stage 3 phase D) beyond keeping `.dx` the shared text form; new rendering features.
