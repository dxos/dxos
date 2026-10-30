# Scene editor common core — implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** One data model (`@dxos/scene`) and one editor (`SceneEditor` in react-ui-canvas) for 2D and 3D scenes, each
dimension supplying only a `DimensionConfig`; react-ui-canvas's own `View`/`Node`/`Link` model, `Intent` and
`ViewStore` are retired, and every consumer moves to the shared model.

**Architecture:** `@dxos/scene` owns data (`Model<O, S>`, `Layout<E, S>`, `Scene<C>`), edits (`LayoutIntent`,
`ModelIntent`), styles (`Style2D`/`Style3D`, `StyleCatalog`, `resolveStyle`). react-ui-canvas owns the editor core
(store, command table, history, clipboard, panels) and the 2D viewport; react-ui-scene owns the 3D viewport. A viewport
renders, picks and turns gestures into intents; it never writes ECHO and never owns a command.

**Tech Stack:** Effect Schema, ECHO (`@dxos/echo`), React, effect atoms (`@effect/atom-react`), Babylon.js (3D),
Manifold (solids), vitest, storybook (localhost:9009).

**Spec:** `packages/ui/react-ui-canvas/docs/COMMON-CORE.md` (decisions 1–11; step 0 = one DSL target). Spec decisions are recorded in
`packages/common/scene/SPEC.mdl` (latest D-89+).

## Global Constraints

- One PR (decision 9): dxos/dxos#14282. Basics first, then tests and storybooks for review (Phase F).
- 2D/3D parity on every task: shared behaviour and implementation; only the viewport and dimension geometry differ.
  Each task's **Parity** line states shared vs per-dimension.
- Every react-ui-canvas record field becomes a typed field of `Element2D` or `Layout2D` (decision 7) — no untyped
  `props` entries for known fields.
- Gestures (drag, resize, rotate, orbit, drag-to-create) stay in memory and commit one intent on release (decision 8).
- Styles: `Style2D` (CSS-like) and `Style3D` (material-like) are separate; one mechanism resolves them (decision 6).
- Cameras are per-viewer view state (D-47); a scene's `camera` is the authored view only.
- No compatibility shims or re-exports when code moves; update every import.
- No casts to silence types (`as any`, `as unknown as`, `!`).
- Workspace deps `workspace:*`; never bump the catalog (`pnpm-workspace.yaml` must not change).
- Tests: `pnpm --filter <pkg> exec vitest run --project=node <file>`; typecheck `npx tsc --noEmit -p tsconfig.json` in
  the package (rebuild a dependency with `moon run <pkg>:build` when a consumer reads stale dist); lint `npx oxlint`;
  format `npx oxfmt` before every commit; commit by pathspec.
- Storybook on :9009 is shared and serves this worktree; never start a second one; restart it (by PID from
  `lsof -ti :9009 -sTCP:LISTEN`, `moon run storybook-react:serve-nodeps`) after deleting or renaming story files.
- Never touch `tools/autocue/showcase/echo3d/*`.

## Review Focus

0. **Diagram output unchanged:** after Phase 0 the illustrator corpus renders the same (`corpus.test.ts` snapshot
   metrics unchanged; `moon run plugin-illustrator:render-diagrams` output compared before/after). Pinned by Task 0.3.

1. **Round-trip parity:** every built-in 2D node and link type (rect, ellipse, cloud, polygon, polyline, note, view,
   instance, path, generator, diagram; line, curve, spline, smart) survives react-ui-canvas record → `Element2D` → render
   → edit → store with no field lost. Pinned by Task 1.3's corpus test.
2. **Drag smoothness:** a 2D drag of 200 elements and a 3D gizmo drag write ECHO once, on release. Pinned by Task 3.2.
3. **Undo with a peer:** an undo after a peer edits another field of the same element keeps the peer's field. Pinned
   by Task 2.3.
4. **Projections own positions:** in lattice/constrained/dynamic modes a move intent may be rewritten or refused; the
   viewport previews via `constrain` before release. Pinned by Tasks 4.1–4.3.
5. **Consumer breakage:** nothing imports the retired `View`/`Intent`/`ViewStore` (Task 5.6 grep gate), and compute,
   UML and code graphs render and edit. Pinned by Tasks 5.3–5.5.

---

## Phase 0 — One DSL target (decision 11)

The `.dx` semantic statements (`diagram`/`node`/`edge`/`group`) and the layout engines currently produce
`@dxos/diagram` `Scene.Command`s (`UpsertObject`/`UpsertElements`/`RemoveElements`/`RemoveObject`/`MoveObject` over
`WorldObject`s of `Box`/`Circle`/`Polyline`/`Curve`/`Arc`/`Text`/`Arrow`/`Portal`, `common/diagram/src/scene.ts`);
`Dsl.compile` returns `ParseResult { commands, problems, ranges }` (`dsl/parse.ts`). Phase 0 makes every engine emit
`@dxos/scene` `Layout2D` elements + model objects through one `LayoutIntent` batch, and moves every reader onto
`Layout2D`.

### Task 0.1: Diagram shapes as `Element2D` kinds; DSL identity as a typed field

**Files:**

- Modify: `packages/common/scene/src/Scene.ts`, `src/element2d.ts` (created here; extended in A.1)
- Test: `packages/common/scene/src/element2d.test.ts`

**Interfaces:**

- Produces: element kinds `box` (`BoxKind` rect/ellipse/diamond/triangle, `corners`), `circle`, `polyline`, `curve`,
  `arc`, `text`, `arrow` (relation, head/tail, route, caption), `portal`; their fields typed on `Element2D`
  (`stroke`/`fill`/`weight`/`color` become `Style2D` fields — Task A.2 adds the style split, this task adds the
  fields); `BaseElement.dsl?: { object: string; element?: string }` (replaces `props.dsl`, D-38).
  `DIAGRAM_FIELD_MAP` (scene.ts element field → `Element2D` path).
- **Parity:** the kinds are 2D; `dsl` identity is on `BaseElement` (3D `.dx` scene statements use it too).

- [ ] **Step 1: Failing test** `test('every @dxos/diagram element field has a typed Element2D field', …)` iterating
      the `Scene.Element` union members' property names through `DIAGRAM_FIELD_MAP` onto `Element2D`'s AST;
      `test('dsl identity is a typed BaseElement field', …)`.
- [ ] **Step 2:** `pnpm --filter @dxos/scene exec vitest run --project=node src/element2d.test.ts` → FAIL.
- [ ] **Step 3:** Implement. **Step 4:** PASS + scene suite.
- [ ] **Step 5:** Commit `scene: diagram shapes as Element2D kinds, typed DSL identity`.

### Task 0.2: Engines emit one `LayoutIntent` batch

**Files:**

- Modify: `packages/common/diagram/src/dsl/compile.ts`, `dsl/parse.ts` (`ParseResult`), `semantic-engine.ts`
  (`compile`), `sequence-engine.ts` (`solve` consumers), `uml-engine.ts` (`compile`), `mermaid-engine.ts`
  (`layout`, `compile`), `dsl/convert.ts`
- Test: `packages/common/diagram/src/dsl/compile.test.ts` (new), existing engine tests

**Interfaces:**

- Produces: `ParseResult = { document: SceneDocument; layout: string; intents: LayoutIntent[]; problems; ranges }`
  (ranges keyed by `dsl` identity); each engine's `compile` returns `LayoutIntent[]` (one `batch`) plus the model
  objects for portals/composites. A temporary test-only helper `commandsToIntents(commands)` exists only inside the
  equivalence test and is deleted in 0.5.
- **Parity:** 2D target (diagrams are 2D); the intent vocabulary is the shared one.

- [ ] **Step 1: Failing test** `test('the corpus compiles to Layout2D with the same geometry as the old commands',
…)`: for every `docs/diagrams/*.mmd` and every `.dx` in `src/testing/exemplars` + `plugin-illustrator` fixtures,
      compile both ways and assert element count, kinds, positions and routes equal (within 1e-6).
- [ ] **Step 2:** `pnpm --filter @dxos/diagram exec vitest run --project=node src/dsl/compile.test.ts` → FAIL.
- [ ] **Step 3:** Switch the engines' emission; the semantic/sequence/UML/mermaid placement and routing code is
      untouched — only the output stage changes.
- [ ] **Step 4:** PASS + full diagram suite (`pnpm --filter @dxos/diagram exec vitest run --project=node`).
- [ ] **Step 5:** Commit `diagram: engines emit Layout2D through one LayoutIntent batch`.

### Task 0.3: The SVG renderer and `.dx.svg` read `Layout2D`

**Files:**

- Modify: `packages/common/diagram/src/svg-file.ts` (`resolveScene` → `resolveLayout`), `dx-svg.ts` (payload =
  `{ format, document: SceneDocument, source }`; `extract` reads it; old payloads still import — see risk 6),
  `svg-handler.ts`; `packages/plugins/plugin-illustrator/src/components/SceneSvg.tsx`
- Test: `dx-svg.test.ts`, `svg-file.test.ts`, `packages/plugins/plugin-illustrator/src/model/corpus.test.ts`

**Interfaces:**

- Produces: `SceneSvg` props `{ document: SceneDocument; layout: string }`; `renderSvg(doc, layout): Markup`.
- Consumes: 0.2's `ParseResult`.
- **Parity:** 2D renderer (the editor's 2D viewport, Phase C, is the interactive counterpart; both resolve styles
  through `resolveStyle` after A.2).

- [ ] **Step 1: Before-image:** run `moon run plugin-illustrator:render-diagrams` and
      `DX_RUN_MANUAL_TESTS=1 moon run plugin-illustrator:test -- src/model/corpus.test.ts`; save the renders to
      `temp/corpus-before/` (gitignored) and keep the committed snapshot.
- [ ] **Step 2: Failing test** `svg-file.test.ts`: `test('a Layout2D renders the same markup as the scene it
replaces', …)`; `dx-svg.test.ts`: `test('a .dx.svg payload carries the SceneDocument and imports back', …)`.
- [ ] **Step 3:** Implement. **Step 4:** PASS; `corpus.test.ts` passes with the snapshot unchanged; re-render and
      diff against `temp/corpus-before/` (byte-identical SVG, or identical metrics where ids change — state which).
- [ ] **Step 5:** Commit `diagram: SVG rendering and .dx.svg on Layout2D`.

### Task 0.4: Illustrator operations and the canvas builder use `Layout2D` directly

**Files:**

- Modify: `packages/plugins/plugin-illustrator/src/operations/{draw,edit,read,convert,generate,score}.ts`,
  `src/commands/drawing/{render,export,import}.ts`, `src/model/drawing-file.ts`;
  `packages/plugins/plugin-canvas/src/model/{handler,builder,compiler}.ts`
- Test: `operations/convert.test.ts`, `commands/drawing/drawing.test.ts`, plugin-canvas `model/handler.test.ts`

**Interfaces:**

- Produces: `DrawingBuilder.apply(canvas, intents: LayoutIntent[])` (no `Scene.Command` translation); the `Draw`
  operation writes the compiled batch into the drawing's layout; `Read` prints `.dx` from `Layout2D`.
- **Parity:** the assistant's `.dx` path is the same for 2D and 3D scene statements.

- [ ] **Step 1: Failing tests:** `test('Draw writes the compiled Layout2D into the canvas', …)`,
      `test('render exports the same SVG as before', …)` (against 0.3's before-image), handler test without the
      command translation.
- [ ] **Steps 2–4:** FAIL → implement → PASS (plugin-illustrator, plugin-canvas suites).
- [ ] **Step 5:** Commit `plugin-illustrator, plugin-canvas: draw, render and build on Layout2D`.

### Task 0.5: Retire `@dxos/diagram`'s scene model as a data model

**Files:** Remove `Scene.Command`, `UpsertObject`/`UpsertElements`/`RemoveElements`/`RemoveObject`/`MoveObject`,
`WorldObject`, `Scene` and the command reducer from `common/diagram/src/scene.ts`; move shape geometry helpers still
needed by renderers/scoring next to them; `aesthetics.ts`, `score.ts`, `appeal.ts`, `diagnostics.ts`, `nudge.ts`,
`objective.ts`, `compact.ts`, `relations` read `Layout2D`/`RenderList2D`. Delete the 0.2 equivalence helper.

- [ ] **Gate:** `grep -rnE "Scene\.Command|UpsertElements|UpsertObject|RemoveElements|MoveObject" packages --include=*.ts --include=*.tsx`
      returns nothing; diagram, plugin-illustrator, plugin-canvas suites and `corpus.test.ts` pass with the snapshot
      unchanged; render-diagrams output matches 0.3's before-image.
- [ ] Commit `diagram: retire the scene command model; diagrams are Layout2D`.

---

## Phase A — One data model (typed 2D, styles)

### Task A.1: Inventory react-ui-canvas record fields into `Element2D`/`Layout2D` (extends 0.1's `element2d.ts`)

**Files:**

- Modify: `packages/common/scene/src/Scene.ts`
- Modify: `packages/common/scene/src/element2d.ts` (from 0.1)
- Test: `packages/common/scene/src/element2d.test.ts`

**Interfaces:**

- Produces: `Element2D` gains typed fields for every node/link field in react-ui-canvas `model/types.ts`:
  `ports?: Record<string, Port>`, `portsPerSide?`, `exposed?: string[]`, `order` (replaces `z`), `locked?`,
  `points?: Vec2[]` (spline/polyline), `params?` per kind (`CloudParams`, `PolygonParams`, `PolylineParams` as typed
  unions keyed by kind), `view?: { scene: string; link?: Ref; overrides?; fit? }` (portal/instance), `path?: { d;
viewBox? }`, `generator?: GeneratorSpec`, `diagram?: DiagramShape`, `heading?: DiagramHeading`, `connector?:
DiagramConnector`, `ends?: LinkEnds`, `from`/`to` with `anchor` = port id or `point?: Vec2` (point endpoints),
  `text?`. `Layout2D` gains `layers?: Record<string, Layer>`, `kind?: 'view' | 'composite'`, `anonymous?`,
  `timeline?: Timeline` (react-ui-canvas `model/timeline.ts`), lattice/constraint/dynamic models (`lattice?:
LatticeSpec`, `constraints?`, `graph?: GraphModel`) as typed fields.
- Port, Layer, LatticeSpec, GraphModel, Timeline schemas move from react-ui-canvas into `@dxos/scene` (no re-export
  left behind; react-ui-canvas imports them from `@dxos/scene`).
- **Parity:** shared — `BaseElement` keeps id/kind/object/label/layer/locked/order/style/links/groups; 2D-only fields
  live on `Element2D`; anything both need (e.g. `locked`, `order`, `layer`, `text`) is on `BaseElement`.

- [ ] **Step 1: Failing test** — `element2d.test.ts`:
      `test('every react-ui-canvas node field has a typed Element2D field', …)` iterates the property names of
      react-ui-canvas `nodeBase`, `boxFields` and each built-in node schema (import from `@dxos/react-ui-canvas` test-only
      via the `testing` export) and asserts each maps through `FIELD_MAP` (exported const, record-field → element path) to
      a property present on `Element2D`'s AST. Same for `linkBase` and link types, and View fields → `Layout2D`.
- [ ] **Step 2:** `pnpm --filter @dxos/scene exec vitest run --project=node src/element2d.test.ts` → FAIL (missing fields).
- [ ] **Step 3:** Add the schemas/fields; export `FIELD_MAP`.
- [ ] **Step 4:** Run → PASS; run the scene suite.
- [ ] **Step 5:** Commit `scene: typed Element2D and Layout2D for every canvas record field`.

### Task A.2: `Style2D`, `Style3D`, `StyleCatalog`, `resolveStyle`

**Files:**

- Create: `packages/common/scene/src/style.ts`, `src/style.test.ts`
- Modify: `src/Scene.ts` (remove the shared `Style`; `BaseElement.style?: string`; `Element2D.overrides?:
Partial<Style2D>`; `Element3D.overrides?: Partial<Style3D>`; `Model<O, S>.styles`, `catalogs?: Ref<StyleCatalog>[]`;
  `Layout<E, S>.styles?: Record<string, Partial<S>>`), `src/index.ts`, `SPEC.mdl` (supersede D-14)

**Interfaces:**

- Produces:
  `Style2D` (fields of react-ui-canvas `styleFields`/`lineStyleFields`: hue, tone, fill, border, rounded, lineStyle,
  fontFamily, fontSize, align, opacity …), `Style3D` (color/hue+tone, metalness, roughness, opacity, glass, emissive,
  rounded), `class StyleCatalog` (ECHO, `org.dxos.type.scene.styleCatalog@0.1.0`: `{ name; dim; styles }`),
  `resolveStyle<S>(element: { style?: string; overrides?: Partial<S> }, layout: { styles?: Record<string,
Partial<S>> }, model: { styles: Record<string, S> }, catalogs: readonly { key: string; styles: Record<string, S>
}[], defaults: Record<string, S>): S`, `styleRef(catalog: string, key: string): string` (`'brand:warning'`).
- **Parity:** shared — the mechanism (`resolveStyle`, catalogs, references); per-dimension — the `S` schema.

- [ ] **Step 1: Failing tests** — `style.test.ts`:
      `test('resolution order: element overrides, layout, model, catalogs in order, defaults', …)` with distinct values
      per level asserting the nearest wins field by field; `test('a catalog reference names its catalog', …)` resolves
      `'brand:warning'` from catalog `brand` not `other`; `test('Style2D and Style3D are distinct schemas', …)` decoding a
      `Style3D`-only field (`metalness`) into `Style2D` fails.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run → PASS; scene suite; diagram suite (`.dx` reader/printer updated: `style=` names a style,
      `overrides` print as before).
- [ ] **Step 5:** Commit `scene: Style2D/Style3D, style catalogs and one resolver`.

### Task A.3: Round-trip corpus and the scene/2 migration on the final shape

**Files:**

- Modify: `packages/plugins/plugin-canvas/src/model/migrate-scenes.ts` (+test)
- Create: `packages/common/scene/src/testing/canvas-corpus.ts` (every built-in node/link type, layers, styles,
  timeline, lattice/constraint/dynamic models)
- Test: `packages/plugins/plugin-canvas/src/model/migrate-scenes.test.ts`

**Interfaces:**

- Consumes: A.1 `FIELD_MAP`, A.2 styles. Produces: `legacyDocument(content): SceneDocument` emitting the final shape
  (styles → `Model2D.styles`, `class` → `style`, own style → `overrides`).
- **Parity:** 2D-only (legacy data is 2D).

- [ ] **Step 1: Failing test** `test('every corpus record round-trips through Element2D with no field lost', …)`:
      legacy content → `legacyDocument` → back through the 2D viewport's read model (`toRenderList2D`, Task C.1) equals the
      original records field by field (deep equal after normalising `z`→`order`).
- [ ] **Step 2:** Run → FAIL. **Step 3:** Implement. **Step 4:** PASS + plugin-canvas suite.
- [ ] **Step 5:** Commit `plugin-canvas: scene/2 migrates straight to the final Element2D shape`.

---

## Phase B — The editor core (3D moves onto it first)

### Task B.1: `SceneEditor` store and `DimensionConfig`

**Files:**

- Create: `packages/ui/react-ui-canvas/src/editor/` — `store.ts`, `config.ts`, `index.ts`, `store.test.ts`
- Modify: `packages/ui/react-ui-canvas/src/index.ts` (export `SceneEditor`)

**Interfaces:**

- Produces:
  `type DimensionConfig<E, C, S> = { dim; viewport: ComponentType<ViewportProps>; tools: ToolDef[]; geometry:
GeometryOps<E>; camera: CameraOps<C>; display: DisplayOptions; sections: InspectorSectionDef[]; propertyForm:
Schema.Schema.Any; styles: StyleOps<S> }`;
  `type ViewportProps = { document: SceneDocument; scene: string; editing: string; selection: readonly string[];
tool: ToolDef; readonly: boolean; onSelect(ids: string[]): void; onIntent(intent: LayoutIntent): void;
onPreview(intent: LayoutIntent | undefined): void; onContextMenu(at: Point, target?: string): void }`;
  `createEditorStore(registry): EditorStore` with atoms `selection`, `tool`, `editing` (drill path), `face`
  (3D-only, ignored by 2D), `preview` (in-flight gesture, decision 8).
  `ToolDef = { id; icon; label; category: 'select' | 'transform' | 'create' | 'lock'; kind?: string; key? }`.
- **Parity:** all shared; `face` documented as dimension-specific state.

- [ ] **Step 1: Failing test** `store.test.ts`: `test('selection, tool and drill path are atoms the panels and
viewport share', …)`; `test('a preview never writes the document', …)` (set `preview`, assert the ECHO layout
      unchanged).
- [ ] **Steps 2–5:** FAIL → implement → PASS (react-ui-canvas suite) → commit `react-ui-canvas: SceneEditor store and
DimensionConfig`.

### Task B.2: One command table

**Files:** Create `src/editor/commands.ts` (+test). Absorb react-ui-canvas `utils/scene-menu.ts`
(`SceneCommands`, `commandMenuItems`) and plugin-canvas `SceneView3D` command callbacks.

**Interfaces:**

- Produces: `buildCommands(ctx: { store; document; config; history; clipboard; readonly }): CommandTable` with
  `Command = { id; label; icon; shortcut?; enabled: boolean; run(): void }` for undo, redo, cut, copy, paste,
  duplicate, delete, group, ungroup, make-object, plus `config`-supplied extras (2D: align/distribute; 3D: join,
  subtract, import mesh, export STL). Keymap derived from the table (one source for actions bar, context menu,
  shortcuts, app edit commands).
- **Parity:** shared table; extras per config.

- [ ] **Step 1: Failing test** `test('2D and 3D configs yield the same shared commands for the same state', …)`;
      `test('locked leaves only copy enabled', …)`; `test('the keymap is derived from the table', …)`.
- [ ] **Steps 2–5:** FAIL → implement → PASS → commit `react-ui-canvas: one command table for both dimensions`.

### Task B.3: History and clipboard in the core

**Files:** Move plugin-canvas `SceneArticle/canvas-history.ts` and `scene-clipboard.ts` into
`react-ui-canvas/src/editor/history.ts`, `clipboard.ts` (+tests moved); delete the originals.

**Interfaces:**

- Produces: `createHistory(canvasKey): History` — canvas-session stacks of inverse `LayoutIntent`/`ModelIntent`
  batches; remote edits skipped; field-level inverses (`writeFields`). `createClipboard()` — `.dx` text on the system
  clipboard + session fallback; lift/flatten across dims (`liftScene`/flatten).
- **Parity:** shared.

- [ ] **Step 1: Failing test** `test('undo after a peer edited another field keeps the peer field', …)` (Review
      Focus 3: two `Obj` writes, undo, assert peer field); existing clipboard tests move and still pass.
- [ ] **Steps 2–5:** FAIL → implement → PASS → commit `react-ui-canvas: history and clipboard move into the core`.

### Task B.4: Panels as `SceneEditor` parts

**Files:** Create `src/editor/SceneEditor.tsx` (+stories later in F), generalising existing pieces in
`components/panels/*` (ToolsPanel/ToolRail, DisplayPanel, InspectorPanel), `Canvas/CanvasBars.tsx` (`CanvasActions`,
`CanvasCamera`, `CanvasTheme`), `SceneContextMenu`.

**Interfaces:**

- Produces: `SceneEditor.Root`, `.Viewport`, `.Tools`, `.Actions`, `.Camera`, `.Display`, `.Inspector`,
  `.ContextMenu` (composite per the composite-components skill); role handling (card/section/slide: viewport only);
  lock; inspector dock (`useInspectorDock` moved from plugin-canvas). Display: theme picker selects the default style
  catalog; grid kind; snap toggle (both dims); guides only when `config.display.guides`.
- **Parity:** all shared; sections and display options from config.

- [ ] **Step 1: Failing test** `SceneEditor.test.tsx` (happy-dom): `test('both configs render the same regions', …)`
      (tool rail, actions, camera, display, inspector present by test id); `test('card role renders the viewport only',
…)`; `test('snap toggle is independent of the grid toggle', …)`.
- [ ] **Steps 2–5:** FAIL → implement → PASS → commit `react-ui-canvas: SceneEditor panels`.

### Task B.5: Shared inspector sections over the scene model

**Files:** Generalise `components/inspectors/*` (Properties, Views, Objects, Layers) to read `SceneDocument` +
store; add `Styles` section. Move plugin-canvas `inspectors-3d.ts`/`element-form.ts` logic into per-dimension
adapters in the configs.

**Interfaces:**

- Produces: `PropertiesSection` (form from `config.propertyForm`, style reference + overrides, vectors via
  `VECTOR_AXIS_LAYOUT`), `ViewsSection` (layout tree, drill-in, scenes list), `ObjectsSection` (model objects; place,
  make object, edit parts; config extras e.g. import mesh), `LayersSection` (hide/lock on `BaseElement.layer`),
  `StylesSection` (model styles then catalogs; "new style from selection").
- **Parity:** shared components; adapters per config.

- [ ] **Step 1: Failing tests** per section (happy-dom): Views lists scenes and drills; Objects place emits a
      `create` with `object`; Layers hide removes elements from `config.geometry.visible`; Styles "new style from
      selection" emits a `ModelIntent` defining a style and an `update` setting `style`.
- [ ] **Steps 2–5:** FAIL → implement → PASS → commit `react-ui-canvas: shared inspector sections incl. Styles`.

### Task B.6: 3D config and viewport on `SceneEditor`

**Files:**

- Create: `packages/ui/react-ui-scene/src/editor/config3d.ts` (+test), `Viewport3D.tsx`
- Modify: `components/Scene3DEditor/*` (becomes `Viewport3D`: render, pick, gizmos, face select, drag-to-create;
  emits intents/previews only); renderer applies `Style3D` via `resolveStyle`; CAD/Presentation become default
  `StyleCatalog`s.
- Modify: `packages/plugins/plugin-canvas/src/containers/SceneArticle/SceneView3D.tsx` → replaced by
  `<SceneEditor.Root config={config3d}>` in `SceneArticle`.

**Interfaces:**

- Produces: `config3d: DimensionConfig<Element3D, Camera3D, Style3D>`; `Viewport3D: ComponentType<ViewportProps>`.
- **Parity:** 3D viewport only; everything else shared.

- [ ] **Step 1: Failing test** `config3d.test.ts`: `test('gizmo drag previews in memory and commits once on
release', …)` (simulated drag: N `onPreview`, 1 `onIntent`); `test('Presentation and CAD are default style
catalogs', …)`.
- [ ] **Steps 2–4:** FAIL → implement → PASS (react-ui-scene, plugin-canvas suites).
- [ ] **Step 5: Browser:** SceneArticle `Scene3D` story — select, move/rotate/scale, create, face select, context
      menu, undo/redo, styles section, display panel; no console errors.
- [ ] **Step 6:** Commit `react-ui-scene: 3D runs on SceneEditor`.

---

## Phase C — The 2D viewport on intents

### Task C.1: 2D render list from `Layout2D`

**Files:** Create `packages/ui/react-ui-canvas/src/viewport2d/render-list.ts` (+test). Modify `SceneLayer` to draw
from `RenderItem2D` (resolved element + resolved `Style2D`) instead of `View` nodes/links.

**Interfaces:**

- Produces: `toRenderList2D(doc: SceneDocument, layout: string, registry: ElementKindRegistry): RenderList2D`
  (items with resolved objects, styles, ports, routed links); `ElementKindRegistry` replaces `NodeRegistry`
  (`kind → { name, icon, schema, render, fields, animatable }`).
- **Parity:** 2D-only render list; 3D already has `renderList`. Shared: object/style resolution.

- [ ] **Steps:** failing test `test('the corpus renders every node and link type', …)` (count and kinds) → implement
      → PASS → commit `react-ui-canvas: 2D render list over Layout2D`.

### Task C.2: 2D gestures emit intents; previews in memory

**Files:** Modify react-ui-canvas `hooks/canvas/*` (drag, resize, rotate, marquee, port-drag link, drag-to-size,
point edit) and `engine/controller.ts` to call `onPreview`/`onIntent` with `LayoutIntent`s; selection via
`onSelect`. Create `src/viewport2d/Viewport2D.tsx` (+test).

**Interfaces:**

- Produces: `Viewport2D: ComponentType<ViewportProps>`; `config2d: DimensionConfig<Element2D, Camera2D, Style2D>`
  (`src/viewport2d/config2d.ts`).
- **Parity:** shared gesture rules (click/shift/marquee/create-tool select, Cmd-drag hand, drag-to-size) via shared
  helpers already in `utils` (`pressSelects`, `isHandDrag`, `boundsFromPoints`); 2D-specific geometry.

- [ ] **Step 1: Failing test** `test('a drag of 200 elements writes once on release', …)` (Review Focus 2: count
      ECHO writes via a recording layout proxy); `test('resize emits a scale intent at release', …)`.
- [ ] **Steps 2–5:** FAIL → implement → PASS → commit `react-ui-canvas: 2D gestures commit intents on release`.

### Task C.3: 2D on `SceneEditor` in plugin-canvas

**Files:** Replace `SceneView2D.tsx` usage in `SceneArticle.tsx` with `<SceneEditor.Root config={config2d}>`;
`CanvasEditCommands`/`CanvasClipboardText` reduce to the core's app-command bridge.

- [ ] **Step 1: Failing test** (happy-dom, plugin-canvas): `test('a 2D canvas edits through LayoutIntent', …)`
      (create + move → `Layout2D` changed; no `View` store involved).
- [ ] **Step 2–4:** FAIL → implement → PASS.
- [ ] **Step 5: Browser:** SceneArticle `Scene2D` story at parity with the current 2D canvas (tools, handles, links,
      portals drill-in, layers, styles, context menu, undo).
- [ ] **Step 6:** Commit `plugin-canvas: 2D runs on SceneEditor`.

---

## Phase D — Modes on the shared model

### Task D.1: Lattice

**Files:** Port `engine/projections/lattice.ts` to a `LayoutIntent` rewriter: `latticeConstrain(layout: Layout2D,
intent: LayoutIntent): LayoutIntent | undefined`; config2d selects it when `layout.lattice` is set.

- [ ] Failing test `test('a move lands on whole lattice cells', …)` (port the existing lattice tests) → implement →
      PASS → commit `react-ui-canvas: lattice mode on Layout2D`.

### Task D.2: Constrained and dynamic

**Files:** Port `constrained.ts` and `dynamic.ts` (their models are `Layout2D.constraints` / `graph`, A.1).

- [ ] Failing tests ported from `constrained.test.ts`/`dynamic.test.ts` (solver re-places after a move; renaming the
      layout keeps the model) → implement → PASS → commit `react-ui-canvas: constrained and dynamic modes on Layout2D`.

### Task D.3: Scored

**Files:** The scoring utilities read `RenderList2D`.

- [ ] Failing test `test('the score over a Layout2D equals the score over the corpus', …)` → implement → PASS →
      commit `react-ui-canvas: scored mode on Layout2D`.

---

## Phase E — Retire the split and move consumers

### Task E.1: Delete the adapters

Delete plugin-canvas `model/layout-writer.ts`, `canvas-content.ts`, `layout-store.ts`'s View binding,
`SceneArticle/SceneView2D.tsx`, `SceneView3D.tsx`, react-ui-scene `canvas/adapter.ts` View mapping; move their still
needed tests to the new modules. Commit `plugin-canvas: remove the View adapters`.

### Task E.2: plugin-canvas operations, import and samples

(The builder and handler moved in 0.4.) `operations/apply.ts`/`patch*.ts`, `import/tldraw*`, samples and stories
build `Layout2D` + intents. Failing test per operation (`Apply` creates elements in the open layout; tldraw import produces
`Element2D`s) → implement → PASS → commit `plugin-canvas: operations and conversion on Layout2D`.

### Task E.3: react-ui-canvas-compute and plugin-conductor (decision 10)

Compute shapes become element kinds in an `ElementKindRegistry`; `scene/echo-store.ts` and `scene/projection.ts`
use `Layout2D` + intents; `CanvasBoard` renders `SceneEditor` with a compute config (its own tools and sections).
Failing tests ported from `scene.test.ts`, `echo-store.test.ts`, `createComputeGraph.test.ts` → implement → PASS;
browser-check the compute stories and plugin-conductor's board; commit `react-ui-canvas-compute: compute board on the
shared model`.

### Task E.4: plugin-uml

`ClassNode` becomes an element kind (`ElementKindSpec` replaces `NodeDefSpec`; `nodeBase` fields → `Element2D`);
failing test `ClassNode.test.ts` updated → PASS; story check; commit `plugin-uml: class shapes as element kinds`.

### Task E.5: plugin-code and small consumers

plugin-code graphs (`DefinitionGraph`, `ChangelogGraph`, `SpecModel`) build `Layout2D` with `lattice`; plugin-debug,
plugin-code-graph, react-ui-scene `Scene2DView` updated; tools/autocue unchanged (utilities only). Tests per package
→ PASS; commit `plugins: code, debug and graph views on the shared model`.

### Task E.6: Remove the old model

Delete react-ui-canvas `model/types.ts`'s `View`/`Node`/`Link`/`Intent`, `model/store.ts` (`ViewStore`,
`createMemoryStore`), `model/intent.ts`, engine projection plumbing that only served them; keep geometry/camera/layout
utilities.

- [ ] **Gate:** `grep -rnE "\b(ViewStore|createMemoryStore|reduceIntent|withLegacyView)\b|type Intent\b" packages --include=*.ts --include=*.tsx`
      returns nothing outside migration code; every package's tsc/lint/tests pass (`MOON_CONCURRENCY=4 moon run
:test -- --no-file-parallelism` in the background).
- [ ] Commit `react-ui-canvas: retire the View model, Intent and ViewStore`.

---

## Phase F — Tests and storybooks for review (decision 9)

### Task F.1: Storybooks per aspect, 2D and 3D side by side

Add/extend stories (each with numbered Test steps in the doc comment, `withTheme()`, translations):

- `SceneEditor` — `Scene2D`, `Scene3D`, `SideBySide` (both configs in one story).
- Panels — `Tools`, `Actions`, `Camera`, `Display` (grid kinds, snap, theme catalogs), `Inspector` (docked/floating).
- Inspector sections — `Properties`, `Views` (scenes list, drill-in), `Objects` (place, make object, parts),
  `Layers` (hide/lock), `Styles` (model styles, catalogs, new style from selection).
- Tools — select/marquee, hand/Cmd-drag, create (2D box, 3D base+height), link, transform, extrude/face (3D).
- Editing — clipboard (copy/cut/paste/duplicate, 2D↔3D paste), undo/redo, context menu, lock.
- Modes — `Lattice`, `Constrained`, `Dynamic`, `Scored`.
- Roles — `Card`, `Section`, `Slide` (no chrome) for both dims.
- Consumers — compute board, UML class diagram, code graph.

### Task F.2: Play tests and e2e coverage

Storybook play functions for the editing stories (clipboard, undo, context menu, create, lock) run by
`moon run react-ui-canvas:test-storybook` and `plugin-canvas:test-storybook`; one Playwright spec in composer-app
opening a 2D and a 3D canvas, editing, reloading.

### Task F.3: Fresh whole-branch review

A fresh reviewer on the most capable model against this plan's Review Focus; one fix pass with RED→GREEN tests.

---

## Risks

1. **Data parity (Phase A):** react-ui-canvas records carry many type-specific fields; a missed field loses data on
   migration. Mitigation: A.1's `FIELD_MAP` test is generated from the record schemas, and A.3's corpus round-trip.
2. **Drag performance (C.2, B.6):** writing ECHO per pointer move would stutter. Mitigation: decision 8 — previews in
   atoms, one intent on release; C.2's write-count test.
3. **Undo with peers (B.3):** inverse intents could revert a peer's concurrent field edit. Mitigation: field-level
   inverses (`writeFields`) and the peer test; whole-document undo steps (Make object) are replaced by inverse
   `ModelIntent`s.
4. **Consumer breakage (Phase E):** compute, UML and code graphs depend on the old model. Mitigation: E.3–E.5 before
   E.6, and E.6's grep gate plus the full test sweep.
5. **Diagram corpus stability (Phase 0):** the illustrator corpus metrics and snapshots (`corpus.test.ts`) and the
   render-diagrams output must stay stable; only the output stage of the engines changes. Mitigation: 0.2's geometry
   equivalence test, 0.3's before/after renders, 0.5's gate.
6. **Existing `.dx.svg` files:** files exported before Phase 0 carry the old payload; `extract` keeps reading it
   (converting once to a `SceneDocument`) so imports into Composer still work.
7. **Scope:** Phase E (especially compute) is large; the plan keeps every phase green so the PR is shippable at the
   end of each phase.

## Relative size

| Phase                     | Tasks | Relative size                                                                 |
| ------------------------- | ----- | ----------------------------------------------------------------------------- |
| 0 — one DSL target        | 5     | L (engines' output stage, renderer, illustrator ops; corpus must stay stable) |
| A — data model            | 3     | M                                                                             |
| B — editor core, 3D first | 6     | L                                                                             |
| C — 2D viewport           | 3     | L                                                                             |
| D — modes                 | 3     | M                                                                             |
| E — retire + consumers    | 6     | XL (compute board is the largest single task)                                 |
| F — review aids           | 3     | M                                                                             |
