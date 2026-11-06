# Scene Editor (Stage 3) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** One editor, grown inside plugin-canvas, edits the Models, Layouts and Scenes of 2D and 3D drawings, so
today's canvas becomes its 2D case, plugin-spacetime is retired, and the assistant edits drawings through the `.dx`
scene DSL.

**Architecture:** A drawing has three aspects (D-27): a **Model** (`Model2D`/`Model3D`) of reusable objects, **Layouts**
(`Layout2D`/`Layout3D`) of positioned elements that place those objects or define a kind inline, and **Scenes**
(`Scene2D`/`Scene3D`), each a layout plus a camera. The editor edits elements in a layout, objects in the model, and
the camera of the scene it is looking through. In 2D, react-ui-canvas keeps its `View`/`ViewStore`/`VersionedSource`
engine and every projection; a store backed by `Layout2D` objects replaces the content-record store (a View is a
layout; the viewport camera is the open `Scene2D`'s). In 3D, a shared `LayoutIntent` reducer in `@dxos/scene`, a
picking contract on `SceneRenderer3D`, Babylon `GizmoManager` handles and a `VersionedSource` over `Layout3D` give
arranging with undo. Every drawing is a plugin-illustrator `Drawing`; its `canvas` Ref is widened to name either the
unchanged `Drawing.Canvas` (tldraw, excalidraw) or plugin-canvas's typed `Canvas`, which holds the metadata, the named
style classes, the model, the layouts and the scenes.

**Tech Stack:** TypeScript, Effect Schema, ECHO (`@dxos/echo`), effect-atom, React, Babylon.js, manifold-3d, vitest.

**Spec:** `agents/superpowers/specs/2026-10-28-scene-editor-design.md` (decisions 1–14); model spec
`packages/common/scene/SPEC.mdl` (D-1…D-33); stage 2 design `agents/superpowers/specs/2026-10-28-scene-model-design.md`.

## What exists (after 1af30746198)

- `@dxos/scene` (`packages/common/scene/src`): `Scene.ts` — `Object2D/3D` (`parts?: string`; stored `parts?: Ref`),
  `makeModelSchema`, `Model<O>`, `BaseElement` (`object?`, `kind?`, …, `arrange?: Arrangement`), `Element2D/3D`,
  `makeLayoutSchema`, `Layout<E, M>`, `Camera2D/3D`, `makeSceneSchema`, `Scene<C, L>`, the `ModelRecord`/
  `LayoutRecord`/`SceneRecord` 2D/3D record forms, `SceneDocument = { scenes, layouts, models }`, and ECHO
  `Model2D/3D`, `Layout2D/3D` (`model?: Ref`), `Scene2D/3D` (`layout: Ref`), each with its own id in `key`.
  `document.ts` — `rootScene`, `findScene/Layout/Model`, `sceneLayout`, `resolve2D/3D`, `resolveLayout2D/3D`,
  `Resolved2D/3D`. `arrange.ts` — `applyArrangement`, `ARRANGERS_3D`, `bounds2D/3D`, `fitChild`. `hierarchy.ts` —
  `layoutTree`. `validate.ts` — `validateDocument → Problem { part, id, element?, message }`. `echo.ts` — `toEcho`,
  `fromEcho(root: StoredScene)`, `StoredScene/Layout/Model`. `testing.ts` — `layout2D`, `model2D`, `scene2D`, … helpers.
- `@dxos/diagram` `Dsl.readScenes`/`Dsl.printScenes` (`src/dsl/scene-model.ts`) over `scene`/`layout`/`model` blocks;
  `EXEMPLARS` in `@dxos/diagram/testing`.
- `@dxos/react-ui-scene`: `canvas/adapter.ts` `toCanvasViews(doc, scene?)` (one View per 2D layout; composites as `view`
  nodes); `three/` — `renderList(doc, scene?, overrides?)`, `RenderItem { key, id, elements, kind, center, scale,
rotation, style?, frame? }`, `SceneRenderer3D`, `camera.ts` (`project`, `orbitBy`, `panBy`, `zoomBy`), `lift.ts`,
  `solid.ts` (`Elements3D`, `evaluateSolid`); `Scene2DView`/`Scene3DView` with a `scene?` id prop.
- plugin-canvas: `model/scene-stage.ts` (`sceneTargets`, `applySample`, `sceneBinding`), `containers/SceneStage/`
  (`useSceneDocument` follows a stored scene, its layout and its model), the legacy content-record store
  (`model/store.ts` `bindCanvasStore`, `createCanvas`; `model/content.ts` `CanvasRecord`, `readViews`, …) over a
  `Drawing.Canvas` with schema `dxos.org/scene/2`, and `types/Canvas.ts` (scene schema constants only).
- plugin-illustrator: `Drawing { name?, canvas: Ref<Drawing.Canvas> }`, `Drawing.Canvas { schema, content, styles? }`,
  `DrawingVariant { id, canvasType?, createCanvas?, builder, card?, article? }`, `DrawingConverter`, and the
  `DrawingOperation` `Read`/`Edit`/`Convert`/`Draw` operations over the semantic diagram DSL.

## Global Constraints

- The editor grows inside plugin-canvas; no new editor plugin (decision 1).
- Editing, rendering and animation depend only on `@dxos/scene`; plugin-canvas's `Canvas` carries metadata (decision 5).
- `Drawing.canvas` is a Ref to either the existing `Drawing.Canvas` (tldraw and excalidraw, structurally unchanged and
  unmigrated) or plugin-canvas's `Canvas = { settings, styles?, model?: Ref<Model>, layouts: Ref<Layout>[],
scenes: Ref<Scene>[] }`; the open scene's type picks the viewport (decisions 6, 10, 14; D-26, D-27).
- plugin-canvas switches to `Layout2D` only when every react-ui-canvas mode runs on it: freehand, lattice, constrained,
  dynamic and scored (decision 13).
- plugin-spacetime is deleted within stage 3, once each of its tools has a test in the new editor (decision 12).
- 3D handles are Babylon's `GizmoManager` (decision 8). The 3D viewer orbits; in an animator stage the animation drives
  the camera (decision 9).
- Only scene canvases (`dxos.org/scene/2`) migrate, into a `Canvas` plus `Model2D`, `Layout2D` and `Scene2D` objects.
  plugin-spacetime data does not migrate.
- Playback samples a scene's layout and never writes it back (D-28). A composite object's `parts` is a nested layout
  (D-29). An element has `object` or `kind`; resolving applies the object, the element's own fields winning (D-31).
- Records are the source of truth; the DSL is their lossless text form. Positions round to 0.001.
- New packages: none. Workspace deps use `workspace:*`; never let `pnpm add` bump the catalog — revert
  `pnpm-workspace.yaml` with `git checkout pnpm-workspace.yaml` if it changes.
- No casts to silence types (`as any`, `!`); `Obj.instanceOf` for ECHO checks; relative imports carry `.ts`.
- Every spec change adds a `decision` to `packages/common/scene/SPEC.mdl` in the same commit.
- Run one test file with `pnpm --filter <pkg> exec vitest run --project=node <file>`; format with `npx oxfmt <files>`
  before every commit; commit by pathspec.
- Never touch `tools/autocue/showcase/echo3d/*`.

## Review Focus

1. A scene drawing opened by an old client after a new client migrated it: the old client finds a `canvas` Ref to a
   type it does not know; its lookup by the base canvas's schema finds no variant, so it shows the drawing as
   unsupported ("Unsupported drawing variant") and writes nothing, rather than create an empty canvas over the
   migrated content.
2. A layout shared by two scenes (two saved views of one 2D drawing): an edit through either shows in both, and
   deleting one scene keeps the layout and the other scene.
3. Undo in 3D after a remote edit to the same element: `patchSource` must skip it, not clobber it.
4. A gizmo drag on an element inside a composite's parts: the intent must target the parts layout, not the root layout,
   and every other element placing the same object moves with it (the parts are shared).
5. `EditScene` given `.dx` text with problems: nothing is written; the problems return to the caller.

Each has a test in the task that owns it (Tasks 4, 2 and 4, 13, 12, 20).

---

## Phase A — 2D on Model, Layout and Scene

### Task 1: Lossless View ⇄ Layout2D mapping

**Files:**

- Modify: `packages/ui/react-ui-scene/src/canvas/adapter.ts`, `packages/common/scene/src/Scene.ts` (layout `props`)
- Test: `packages/ui/react-ui-scene/src/canvas/adapter.test.ts`

**Interfaces:**

- Consumes: `toCanvasViews(doc, scene?)` and its internal `toView` (exist); react-ui-canvas `View`, `Node`, `Link`,
  `Layer`, `ViewNode` (`scene`, `link?`), `InstanceNode` (`composite`, `overrides?`, `fit?`).
- Produces:
  - `toCanvasView(doc: Scene.SceneDocument, layout: Scene.LayoutRecord2D): View` (today's `toView`, exported).
  - `fromCanvasView(view: View): { layout: Scene.LayoutRecord2D; objects: Scene.Object2D[] }` — a `view` node becomes an
    element placing a composite object `view:<scene>` whose `parts` is that View's id (its `link` kept under
    `element.props.canvas.link`); an `instance` node becomes an element placing the object `instance:<composite>`
    (parts = the composite View), with `overrides` and `fit` under `element.props.canvas`.
  - Node and link fields with no `Element2D` slot are kept under `element.props.canvas`; View-level `layers`, `kind`
    and `anonymous` under the layout's new `props.canvas`.
  - `makeLayoutSchema` gains `props: Schema.optional(Schema.Record(Schema.String, Schema.Any))`.

- [ ] **Step 1: Write the failing tests**

```ts
test('round-trips every node type and link shape in the canvas samples', () => {
  for (const view of sampleViews()) {
    const { layout, objects } = fromCanvasView(view);
    const doc = { scenes: [], layouts: [layout], models: [{ id: 'm', dim: '2d', objects: keyed(objects) }] };
    expect(toCanvasView(doc, { ...layout, model: 'm' })).toEqual(withLegacyView(view));
  }
});
test('keeps a node field Element2D has no slot for under props.canvas', () => {
  const { layout } = fromCanvasView(viewWith(rectNode('a', { text: { align: 'left' } })));
  expect(layout.elements.a.props?.canvas).toMatchObject({ text: { align: 'left' } });
});
test('maps z to order and a link endpoint to a binding', () => {
  // elements.a.order === node.z; elements.ab.from.element === link.source.node
});
test('a view node places a composite object whose parts is the inner View', () => {
  // objects includes { id: 'view:b-detail', kind: 'rect', parts: 'b-detail' }; elements.b.object === 'view:b-detail'
});
test('two instance nodes of one composite place the same object', () => {
  // both elements' object === 'instance:c'; objects has it once
});
```

`sampleViews()` reads the Views of the `@dxos/react-ui-canvas/testing` samples (every registered node type, every link
`type`); `keyed(objects)` is `Object.fromEntries(objects.map((o) => [o.id, o]))`.

- [ ] **Step 2: Run, expect FAIL** — `pnpm --filter @dxos/react-ui-scene exec vitest run --project=node src/canvas/adapter.test.ts`
      → `fromCanvasView is not a function`.
- [ ] **Step 3: Implement.** SPEC decision (agent, for user): "Layouts carry renderer-specific props, as elements do;
      a canvas portal or instance becomes an element placing a composite object." Fills in [D-29].
- [ ] **Step 4: Run, expect PASS** (same command), plus `pnpm --filter @dxos/scene exec vitest run --project=node`.
- [ ] **Step 5: Commit** `react-ui-scene: lossless View and Layout2D mapping`.

### Task 2: A ViewStore over Layout2D objects, and a document watcher

**Files:**

- Create: `packages/common/scene/src/watch.ts`, `packages/plugins/plugin-canvas/src/model/layout-store.ts`
- Modify: `packages/plugins/plugin-canvas/src/containers/SceneStage/use-scene-document.ts`
- Test: `packages/common/scene/src/watch.test.ts`, `packages/plugins/plugin-canvas/src/model/layout-store.test.ts`,
  `packages/plugins/plugin-canvas/src/containers/SceneStage/use-scene-document.test.tsx`

**Interfaces:**

- Consumes: Task 1 `toCanvasView`/`fromCanvasView`; `Scene.Scene2D`, `Scene.Layout2D`, `Scene.Model2D`, `fromEcho`;
  react-ui-canvas `ViewStore`, `VersionedSource`, `diffPaths`.
- Produces:
  - `reachedObjects(scene: StoredScene): Obj.Any[]` in `@dxos/scene` — the scene, its layout, its model, and every
    parts layout (and that layout's model) the model's composite objects reach, each once.
  - `bindLayoutStore(registry: Registry.AtomRegistry, scene: Scene.Scene2D): BoundLayoutStore` where
    `BoundLayoutStore = { store: ViewStore; root: ViewId; camera: Atom.Writable<Scene.Camera2D>; dispose: () => void }`.
    View ids are layout `key`s; the root is the scene's layout; parts layouts open as their own Views; writes go to
    the layout that owns the element, and a new composite object is written to the root layout's model.
  - `camera` starts at `scene.camera` (the authored view) and is never written back: a viewer's camera is their own
    view state (D-47).
  - `useSceneDocument` subscribes to every object `reachedObjects` returns (closes the TASKS.md follow-up "edits to
    parts layouts do not reach a playing stage").

- [ ] **Step 1: Failing tests**

```ts
// watch.test.ts
test('reachedObjects lists the scene, its layout, its model and every parts layout once', ...); // subscene exemplar via toEcho
// layout-store.test.ts
test('a node moved through the store is written to the Layout2D element', ...);  // elements.a.center
test('an ECHO edit to the Layout2D reaches the View atom', ...);                   // registry.get(store.view(root)).nodes.a
test("a composite's parts layout opens as its own View, and edits there write that layout", ...);
test('versions.read at earlier heads returns the earlier View', ...);             // undo reads the past
test('an unchanged element is not rewritten when another moves', ...);           // per-element writes merge in ECHO
test('a camera change is written to the Scene2D, not the layout', ...);
test('two scenes over one layout both see an edit made through either', ...);     // Review Focus 2
// use-scene-document.test.tsx
test('follows edits to a composite object\'s parts layout', ...);
```

Use `EchoTestBuilder` with `Scene2D`, `Layout2D`, `Model2D` registered, and `toEcho` over `EXEMPLARS.subscene`.

- [ ] **Step 2: Run, expect FAIL** — `pnpm --filter @dxos/scene exec vitest run --project=node src/watch.test.ts`, then
      `pnpm --filter @dxos/plugin-canvas exec vitest run --project=node src/model/layout-store.test.ts src/containers/SceneStage/use-scene-document.test.tsx`.
- [ ] **Step 3: Implement.** Writes diff the new View against the old (`diffPaths`) and write only changed elements via
      `Obj.change`; `versions` maps `[viewId, 'nodes', id, …]` onto the owning layout's `elements.<id>` and reads past
      values at that object's heads, as `bindCanvasStore` does for content records.
- [ ] **Step 4: Run, expect PASS** (both commands).
- [ ] **Step 5: Commit** `plugin-canvas: ViewStore over Layout2D objects`.

### Task 3: `Drawing.canvas` accepts either canvas type

**Files:**

- Modify: `packages/plugins/plugin-illustrator/src/types/Drawing.ts`, `src/types/IllustratorCapabilities.ts`,
  `src/util/load-drawing.ts`, and every reader of `drawing.canvas` in plugin-illustrator
- Test: `packages/plugins/plugin-illustrator/src/types/Drawing.test.ts` (create)

**Interfaces:**

- Produces:
  - `Drawing.canvas` becomes `Ref.Ref(Obj.Unknown)` naming a `Drawing.Canvas` or a plugin-canvas `Canvas`;
    `Drawing.make({ name, canvas }: { name?: string; canvas: Obj.Any }): Drawing`. `Drawing.Canvas`, `makeCanvas` and
    `isCanvas` are unchanged, and so are the tldraw and excalidraw plugins.
  - `DrawingVariant.canvasType` (exists) now selects a variant by the canvas object's type;
    `createCanvas?: (input?) => Effect.Effect<Obj.Any, Error, Database.Service>`; `DrawingBuilder` and
    `DrawingConverter.convert` take `Obj.Any` and narrow with the variant's type.
  - `variantFor(canvas: Obj.Any, variants: readonly DrawingVariant[]): DrawingVariant | undefined` — by `canvasType`
    first, then by `schema` for a `Drawing.Canvas`.

- [ ] **Step 1: Failing tests** — a tldraw drawing made the current way resolves the tldraw variant; a `Drawing` whose
      canvas is a typed canvas resolves the variant naming that type; a query for `Drawing.Drawing` returns all of them
      together (decision 10).
- [ ] **Step 2: Run, expect FAIL** — `pnpm --filter @dxos/plugin-illustrator exec vitest run --project=node src/types/Drawing.test.ts`.
- [ ] **Step 3: Implement.** `resolveVariant` in `load-drawing.ts` goes through `variantFor`.
- [ ] **Step 4: Run, expect PASS**, plus the whole plugin-illustrator, plugin-tldraw and plugin-excalidraw suites
      (`pnpm --filter <pkg> exec vitest run --project=node`, unchanged results) and `npx tsc --noEmit -p tsconfig.json`
      in each.
- [ ] **Step 5: Commit** `plugin-illustrator: a drawing's canvas may be any canvas type`.

### Task 4: The plugin-canvas `Canvas` type and the migration

**Files:**

- Modify: `packages/plugins/plugin-canvas/src/types/Canvas.ts`, `src/model/store.ts` (`createCanvas`),
  `src/capabilities/drawing-variant.ts`, `src/capabilities/schema.ts`
- Create: `packages/plugins/plugin-canvas/src/model/canvas-document.ts`, `src/model/migrate-scenes.ts`
- Test: `packages/plugins/plugin-canvas/src/model/canvas-document.test.ts`, `src/model/migrate-scenes.test.ts`

**Interfaces:**

- Consumes: Task 1 `fromCanvasView`; Task 3 `variantFor`; the v2 reader (`readViews`, `canvasRecordOf`, `readStyles`).
- Produces:
  - `Canvas.Canvas` — DXN `org.dxos.type.canvas.canvas@0.1.0` (the legacy `Drawing.Canvas` keeps
    `org.dxos.type.canvas`): `{ settings: CanvasSettings; styles?: Record<string, StyleClass>; model?: Ref<Obj.Unknown>;
layouts: Ref<Obj.Unknown>[]; scenes: Ref<Obj.Unknown>[] }`, where `CanvasSettings` is today's `CanvasRecord` minus
    `kind` and `root` (lattice, grid, readonly, theme, styleSet, background, backgroundGrid, diagramShapes).
  - `createCanvas(settings?: Partial<CanvasSettings> & { dimension?: Scene.Dimension }): { canvas: Canvas.Canvas; model:
Scene.StoredModel; layout: Scene.StoredLayout; scene: Scene.StoredScene }` — one empty model, one layout over it and
    one scene over that.
  - `openScene(canvas: Canvas.Canvas): Scene.StoredScene | undefined` — the first scene (the one the article opens).
  - `canvasDocument(canvas: Canvas.Canvas): Scene.SceneDocument` — every scene, layout and model the canvas lists, in
    record form (closes the TASKS.md follow-up "`fromEcho` reads only the scene it is given").
  - `deleteScene(canvas, scene)` — removes the scene; its layout stays while another scene or a `parts` names it.
  - `migrateSceneDrawing(drawing: Drawing.Drawing): Effect.Effect<boolean, Error, Database.Service>` — for a drawing
    whose canvas is a `Drawing.Canvas` with schema `dxos.org/scene/2`: per View one `Layout2D` and one `Scene2D` (its
    camera fitted to the View's `bounds2D`, since v2 content stores no viewport), one `Model2D` holding the composite objects
    `fromCanvasView` returns, the settings and `styles` onto a new `Canvas`, and `drawing.canvas` repointed to it in
    one change. Returns whether it changed anything; any other drawing is left as it is.

- [ ] **Step 1: Failing tests**

```ts
test('createCanvas() makes a Canvas over one model, layout and scene; dimension 3d makes 3D ones', ...);
test('canvasDocument reads every scene, layout and model of the canvas', ...);
test('deleteScene keeps a layout another scene still uses', ...);                  // Review Focus 2
test('every sample canvas reads the same Views before and after migration', ...);  // bindCanvasStore(legacy) vs bindLayoutStore
test('running it twice changes nothing the second time', ...);
test('a tldraw drawing is left as it is', ...);
test('a portal to another drawing keeps its link and opens read-through', ...);
test('named style classes and settings move onto the Canvas', ...);
test('a lattice canvas keeps lattice: true in its settings', ...);
test('an old client sees the migrated canvas as a type it cannot open', ...);      // Review Focus 1: variantFor → undefined
```

Samples: `packages/plugins/plugin-canvas/src/samples/*` and the `@dxos/react-ui-canvas/testing` sample Views, each
written into a v2 `Drawing.Canvas` with `writeViews`.

- [ ] **Step 2: Run, expect FAIL** — `pnpm --filter @dxos/plugin-canvas exec vitest run --project=node src/model/canvas-document.test.ts src/model/migrate-scenes.test.ts`.
- [ ] **Step 3: Implement.** ECHO's `Migration.define` maps one type to one type and `Migration.defineContent` cannot
      create objects, so the migration runs when a scene drawing is opened for writing (the article surface) and from a
      space-level `MigrateDrawings` operation; a read-only viewer keeps reading the legacy canvas. The existing
      `dxos.org/scene/1 → 2` content migration stays, so a v1 canvas reaches v2 first. An article that finds no variant
      for its canvas shows it as unsupported and writes nothing. SPEC decision (agent, for user): "plugin-canvas's `Canvas` keeps settings
      and style classes; drawing content lives in its model, layouts and scenes." Fills in [D-26] and [D-27].
- [ ] **Step 4: Run, expect PASS.**
- [ ] **Step 5: Commit** `plugin-canvas: Canvas type over model, layouts and scenes, migrated from scene canvases`.

### Task 5: Convert to and from a canvas through Layout2D

**Files:**

- Modify: `packages/plugins/plugin-illustrator/src/operations/convert.ts`,
  `packages/plugins/plugin-canvas/src/capabilities/tldraw-converter.ts`
- Test: `packages/plugins/plugin-illustrator/src/operations/convert.test.ts`,
  `packages/plugins/plugin-canvas/src/capabilities/tldraw-converter.test.ts` (create if absent)

**Interfaces:**

- Consumes: Tasks 3–4.
- Produces: `Convert` and `DrawingConverter` keep their shape for tldraw ⇄ excalidraw. When plugin-canvas is the source
  or target, its converter reads or writes the root `Layout2D` of the canvas's open scene (shapes become inline
  elements; the model stays empty) instead of `Drawing.Canvas` content records.

- [ ] **Step 1: Failing tests** — tldraw → canvas yields a `Drawing` whose `Canvas` opens a scene whose layout holds
      the converted shapes; canvas → excalidraw reads them back out; tldraw → excalidraw is unchanged.
- [ ] **Step 2: Run, expect FAIL** — `pnpm --filter @dxos/plugin-illustrator exec vitest run --project=node src/operations/convert.test.ts`.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run, expect PASS**, plus `pnpm --filter @dxos/plugin-canvas exec vitest run --project=node src/capabilities`.
- [ ] **Step 5: Commit** `plugin-canvas: convert drawings through Layout2D`.

### Task 6: Lattice mode on Layout2D

**Files:**

- Modify: `packages/plugins/plugin-canvas/src/containers/CanvasArticle/CanvasArticle.tsx` (projection choice reads
  `canvas.settings.lattice`)
- Test: `packages/plugins/plugin-canvas/src/model/layout-store.test.ts`

**Interfaces:**

- Consumes: Task 2 `bindLayoutStore`, Task 4 `Canvas.settings`; react-ui-canvas `createLatticeProjection`.
- Produces: no new API — the lattice projection runs over the `ViewStore` that `bindLayoutStore` returns.

- [ ] **Step 1: Failing tests** — the cases in `react-ui-canvas/src/engine/projections/lattice.test.ts` re-run with a
      store from `bindLayoutStore` over each lattice sample: a move lands on whole cells, a resize spans whole cells,
      links route along gutters, and each result is written to the `Layout2D` elements.
- [ ] **Step 2: Run, expect FAIL** — `pnpm --filter @dxos/plugin-canvas exec vitest run --project=node src/model/layout-store.test.ts`.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run, expect PASS.**
- [ ] **Step 5: Commit** `plugin-canvas: lattice canvases on Layout2D`.

### Task 7: Constrained and dynamic modes on Layout2D

**Files:**

- Modify: `packages/ui/react-ui-canvas/src/engine/projections/constrained.ts`, `dynamic.ts`,
  `packages/plugins/plugin-canvas/src/model/content.ts` (`CanvasSettings.projection`)
- Create: `packages/plugins/plugin-canvas/src/model/projection-model.ts`
- Test: `packages/plugins/plugin-canvas/src/model/projection-model.test.ts`

**Interfaces:**

- Consumes: Task 1 layout `props`.
- Produces: `layoutModelSource<M>(layout: Scene.Layout2D, key: 'constrained' | 'dynamic', schema: Schema.Schema<M>):
VersionedSource` — keeps a projection's own model (`ConstrainedModel`, the dynamic graph) under
  `layout.props.<key>`, so it persists with the arrangement it constrains and undo patches it;
  `createConstrainedProjection` and `createDynamicProjection` accept it as their `model` source in place of
  `atomSource`. `CanvasSettings.projection?: 'freehand' | 'lattice' | 'constrained' | 'dynamic'` (`lattice: true`
  reads as `'lattice'`) so a canvas opens in its mode.

- [ ] **Step 1: Failing tests** — a constrained move rewrites the stored constraints and survives reopening; undo
      restores the earlier constraints; the dynamic projection's graph round-trips the same way.
- [ ] **Step 2: Run, expect FAIL** — `pnpm --filter @dxos/plugin-canvas exec vitest run --project=node src/model/projection-model.test.ts`.
- [ ] **Step 3: Implement.** SPEC decision (agent, for user): "A projection's own model lives in its layout's props."
- [ ] **Step 4: Run, expect PASS**, plus `pnpm --filter @dxos/react-ui-canvas exec vitest run --project=node src/engine/projections`.
- [ ] **Step 5: Commit** `plugin-canvas: constrained and dynamic canvases on Layout2D`.

### Task 8: Scored mode on Layout2D

**Files:**

- Modify: `packages/ui/react-ui-canvas/src/components/Canvas/Scored.stories.tsx`
- Test: `packages/plugins/plugin-canvas/src/model/layout-store.test.ts`

**Interfaces:**

- Consumes: Task 2; `@dxos/diagram` `Score`, `Objective`, `Diagnostics`; react-ui-canvas `toDiagramObjects`,
  `diagnosticElements`.
- Produces: no new API — scoring reads the Views a `Layout2D`-backed store emits.

- [ ] **Step 1: Failing test** — for each scored sample, `Score` over the View from `bindLayoutStore` equals `Score`
      over the View from a memory store of the same View.
- [ ] **Step 2: Run, expect FAIL** — `pnpm --filter @dxos/plugin-canvas exec vitest run --project=node src/model/layout-store.test.ts`.
- [ ] **Step 3: Implement** — the story builds its store with `bindLayoutStore`.
- [ ] **Step 4: Run, expect PASS**; verify the Scored story in storybook and link it.
- [ ] **Step 5: Commit** `react-ui-canvas: scored canvases on Layout2D`.

### Task 9: plugin-canvas edits through the layout store

**Files:**

- Modify: `packages/plugins/plugin-canvas/src/containers/CanvasArticle/use-canvas-scene.ts`, `CanvasArticle.tsx`,
  `containers/CanvasCard/CanvasCard.tsx`, `containers/CanvasStage/CanvasStage.tsx`, `containers/CanvasProperties/*`,
  `operations/apply.ts`, `operations/patch-store.ts`, `capabilities/animator-stage.ts`, `model/builder.ts`,
  `model/handler.ts`
- Modify: `packages/ui/react-ui-canvas/src/components/inspectors/ViewsInspector/*` (lists scenes)
- Test: `packages/plugins/plugin-canvas/src/containers/CanvasArticle/use-canvas-scene.test.ts` (create),
  `src/operations/operations.test.ts`, `src/model/handler.test.ts`

**Interfaces:**

- Consumes: Tasks 2–8.
- Produces:
  - `useBoundLayoutStore(canvas: Canvas.Canvas, scene?: Scene.Scene2D): BoundLayoutStore | undefined` replaces
    `useBoundCanvasStore`, in every mode; `bindCanvasStore` stays only as the reader Task 4's migration uses.
  - The Views inspector lists the canvas's scenes: selecting one opens it (its layout and camera); "Add scene" makes a
    `Scene2D` over the current layout at the current camera; delete goes through `deleteScene`.
  - The canvas variant's `builder` (`CanvasBuilder`, `SceneHandler`) reads and writes the open scene's layout, so the
    illustrator `Read`/`Edit`/`Draw` operations keep working on canvas drawings.

- [ ] **Step 1: Failing tests** — opening a legacy sample drawing migrates it and edits its `Layout2D`; the `Apply` and
      `Patch` operations write `Layout2D` elements; StyleClassList edits `Canvas.styles`; the illustrator `Draw` of a
      diagram into a canvas drawing writes the layout; adding a scene keeps one layout and two cameras.
- [ ] **Step 2: Run, expect FAIL** — `pnpm --filter @dxos/plugin-canvas exec vitest run --project=node src/operations/operations.test.ts src/model/handler.test.ts src/containers/CanvasArticle/use-canvas-scene.test.ts`.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run the whole package**: `pnpm --filter @dxos/plugin-canvas exec vitest run --project=node` → all pass;
      then `moon run react-ui-canvas:test-browser` (playwright specs) → unchanged; typecheck plugin-canvas and
      plugin-illustrator.
- [ ] **Step 5: Verify in storybook** — the `CanvasArticle` stories in each mode render and edit; link each story.
- [ ] **Step 6: Commit** `plugin-canvas: edit canvases as layouts and scenes`.

## Phase B — 3D arranging, and the model's objects

### Task 10: Layout intents

**Files:**

- Create: `packages/common/scene/src/intent.ts`
- Test: `packages/common/scene/src/intent.test.ts`
- Modify: `packages/common/scene/src/index.ts`, `SPEC.mdl`

**Interfaces:**

- Produces:
  - `LayoutIntent` (Schema union, `kind` tag): `create { element }`, `delete { ids }`, `update { id, path: string[],
value }`, `reorder { id, order }`, `group { id, members, arrange? }`, `ungroup { id }`, `bind { link: Element }`,
    `move { ids, delta: Vec2 | Vec3 }`, `rotate { ids, delta: number | Vec3 }`, `scale { ids, factor: Size2 | Vec3 }`,
    `batch { intents }`.
  - `applyIntent<L extends LayoutRecord>(layout: L, intent: LayoutIntent): L` — pure; geometric intents dispatch on
    `layout.dim`; positions round to 0.001.
  - `isLayoutIntent: (value: unknown) => value is LayoutIntent`.

- [ ] **Step 1: Failing tests**

```ts
test('move adds a Vec3 delta to each 3D center and rounds to 0.001', ...);
test('rotate adds Euler degrees; scale multiplies per axis', ...);
test('delete removes the elements and every link bound to them', ...);
test('group adds a group element over its members; ungroup removes it and keeps the members', ...);
test('moving an arranged member sets pinned', ...);
test('an intent naming a missing id returns the layout unchanged', ...);
test('isLayoutIntent refuses a 2D delta on a 3D move', ...);
test('batch applies its intents in order', ...);
test('create of an element placing an object keeps object and sets no kind', ...);
```

- [ ] **Step 2: Run, expect FAIL** — `pnpm --filter @dxos/scene exec vitest run --project=node src/intent.test.ts`.
- [ ] **Step 3: Implement.** SPEC decision (agent, for user): "Layouts are edited by `LayoutIntent`s: one reducer,
      geometry by dimension." 2D keeps react-ui-canvas's own `Intent` in stage 3; converging the two stays a follow-up.
- [ ] **Step 4: Run, expect PASS.**
- [ ] **Step 5: Commit** `scene: layout intents`.

### Task 11: Picking

**Files:**

- Modify: `packages/ui/react-ui-scene/src/three/camera.ts`, `renderer.ts`
- Test: `packages/ui/react-ui-scene/src/three/camera.test.ts`, `renderer.test.ts`

**Interfaces:**

- Produces:
  - `groundPoint(camera: Scene.Camera3D, viewport: Viewport, screen: { x: number; y: number }, height = 0): Scene.Vec3 | undefined`
  - `SceneRenderer3D.pick(screen: { x: number; y: number }): { item?: string; point?: Scene.Vec3; normal?: Scene.Vec3 }`
    — `item` is the `RenderItem.key` (`<composite>/<id>` inside parts), `normal` the picked face's world normal.

- [ ] **Step 1: Failing tests** — `groundPoint` is the inverse of `project` for points on y=0 (perspective and
      orthographic) and undefined when the ray is parallel to or points away from the plane. Renderer (Babylon
      `NullEngine`, as `renderer.test.ts` does): picking the screen centre over a cube at the origin returns its key;
      over empty space returns only a ground point; over an element inside a composite returns the `a/b` key.
- [ ] **Step 2: Run, expect FAIL** — `pnpm --filter @dxos/react-ui-scene exec vitest run --project=node src/three/camera.test.ts src/three/renderer.test.ts`.
- [ ] **Step 3: Implement.** Tag meshes with `metadata.key`; pick with `scene.pick`. If `NullEngine` cannot pick, test
      `pick` through a pure ray–box function and record a ruling.
- [ ] **Step 4: Run, expect PASS.**
- [ ] **Step 5: Commit** `react-ui-scene: pick elements and ground points`.

### Task 12: Scene3DEditor with gizmos and drill-in

**Files:**

- Create: `packages/ui/react-ui-scene/src/components/Scene3DEditor/{Scene3DEditor.tsx,gizmo.ts,gizmo.test.ts,target.ts,target.test.ts,Scene3DEditor.stories.tsx,index.ts}`
- Modify: `packages/ui/react-ui-scene/src/components/Scene3DView/Scene3DView.tsx` (extract a shared `useRenderer` hook)

**Interfaces:**

- Consumes: Task 10 `LayoutIntent`, Task 11 `pick`; `renderList`, `Resolved3D`.
- Produces:
  - `Scene3DEditorProps = { document: Scene.SceneDocument; scene: string; editing?: string /* layout id, default the
scene's */; selection: readonly string[]; tool: Tool3D; onSelect: (ids: string[]) => void; onIntent: (layout:
string, intent: Scene.LayoutIntent) => void; onEdit: (layout: string) => void /* drill in or out */ }`
  - `Tool3D = 'select' | 'move' | 'rotate' | 'scale' | 'link' | { create: string } | { place: string /* object id */ }`
  - `targetOf(doc: Scene.SceneDocument, scene: string, key: string): { layout: string; element: string } | undefined`
    — the layout that owns a render-list key (the parts layout for `a/b`).
  - `gizmoIntent(mode: 'move' | 'rotate' | 'scale', id: string, before: Scene.Resolved3D, after: { center: Vec3;
rotation: Vec3; scale: Vec3 }): Scene.LayoutIntent | undefined`
  - `SceneRenderer3D.attachGizmo(key: string | undefined, mode, onEnd: (after) => void): void`

- [ ] **Step 1: Failing tests** — `gizmo.test.ts`: a move drag yields `move` with the center delta; rotate yields
      degrees; scale yields per-axis factors; an unchanged transform yields undefined. `target.test.ts`: a key inside a
      composite resolves to the parts layout and its element (Review Focus 4); every element placing that object then
      shows the move, because they share the parts.
- [ ] **Step 2: Run, expect FAIL** — `pnpm --filter @dxos/react-ui-scene exec vitest run --project=node src/components/Scene3DEditor`.
- [ ] **Step 3: Implement.** Click selects (shift toggles); an empty click clears; double-click on a composite calls
      `onEdit(parts)` and the rest of the scene dims; Escape goes back out. `{ create: kind }` places an inline unit
      element at `groundPoint`; `{ place: object }` places an element with that `object`; `link` binds the first and
      second clicked elements. Orbit stays on the middle and right buttons while a tool owns the left.
- [ ] **Step 4: Run, expect PASS.** Story over every 3D exemplar; verify in the browser pane and link the story.
- [ ] **Step 5: Commit** `react-ui-scene: 3D editor viewport with gizmos and drill-in`.

### Task 13: Undo over Layout3D

**Files:**

- Create: `packages/plugins/plugin-canvas/src/model/layout-source.ts`
- Test: `packages/plugins/plugin-canvas/src/model/layout-source.test.ts`

**Interfaces:**

- Produces: `layoutSource(layout: Scene.StoredLayout): VersionedSource` (paths `['elements', id, …]`) and
  `applyLayoutIntent(layout: Scene.StoredLayout, intent: Scene.LayoutIntent): void` — applies via `applyIntent` and
  writes only the changed elements in one `Obj.change`.

- [ ] **Step 1: Failing tests** — apply, undo (react-ui-canvas `recordChanges` + `patchSource`) restores the elements,
      redo reapplies; a remote edit to the same element after the change makes undo skip it (`skipped: 1`, Review
      Focus 3); a change recorded across a root layout and a parts layout undoes both.
- [ ] **Step 2: Run, expect FAIL** — `pnpm --filter @dxos/plugin-canvas exec vitest run --project=node src/model/layout-source.test.ts`.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run, expect PASS.**
- [ ] **Step 5: Commit** `plugin-canvas: undo for 3D layouts`.

### Task 14: The 3D canvas article

**Files:**

- Create: `packages/plugins/plugin-canvas/src/containers/SceneArticle/{SceneView3D.tsx,SceneArticle.stories.tsx,index.ts}`
- Modify: `packages/plugins/plugin-canvas/src/capabilities/react-surface.tsx`, `capabilities/drawing-variant.ts`
  (create flow), `translations.ts`
- Test: `packages/plugins/plugin-canvas/src/plugin.test.ts`

**Interfaces:**

- Consumes: Tasks 4, 12, 13.
- Produces: the article surface renders `SceneArticle`, which picks its 2D or 3D view from `openScene(canvas)`'s type; a toolbar
  (`useMenuActions` + `Menu.Root`, one `Toolbar.Root`) with select, move/rotate/scale, create cube/sphere/cylinder/
  cone, link, group, ungroup, delete, undo, redo; a Properties panel as a `Form` over `Scene.Element3D`; the scenes
  list shared with 2D (Task 9); the orbit camera kept in the viewer's react-ui-attention view state (`scene3dViewAspect`), never written to the
  `Scene3D` (D-47); "New 3D
  canvas" in the create flow (`createCanvas({ dimension: '3d' })`, wrapped in a `Drawing`).

- [ ] **Step 1: Failing test** — the plugin's create operation with `dimension: '3d'` yields a `Drawing` whose
      `Canvas` opens a `Scene3D` over a `Layout3D`; the surface resolver returns the 3D article for it.
- [ ] **Step 2: Run, expect FAIL** — `pnpm --filter @dxos/plugin-canvas exec vitest run --project=node src/plugin.test.ts`.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run, expect PASS**; `npx tsc --noEmit -p tsconfig.json`; verify the story in storybook and link it.
- [ ] **Step 5: Commit** `plugin-canvas: 3D canvas article`.

### Task 15: The Library panel (the model's objects)

**Files:**

- Create: `packages/common/scene/src/model-intent.ts`, `packages/plugins/plugin-canvas/src/containers/LibraryPanel/{LibraryPanel.tsx,LibraryPanel.stories.tsx,index.ts}`
- Modify: `CanvasArticle.tsx`, `SceneArticle/SceneView3D.tsx` (panel slot)
- Test: `packages/common/scene/src/model-intent.test.ts`

**Interfaces:**

- Produces:
  - `ModelIntent`: `define { object }`, `update { id, path, value }`, `remove { id }`, `extract { layout, ids, object }`
    (turns selected elements into a composite object whose parts is a new layout holding them, and leaves one element
    placing it).
  - `applyModelIntent(doc: Scene.SceneDocument, intent: ModelIntent): { doc: Scene.SceneDocument; problems: Problem[] }`
    — `remove` of an object some element still places is refused with a problem.
  - `LibraryPanel` lists the canvas model's objects (name, kind, a thumbnail through `Scene2DView`/`Scene3DView` of its
    parts), and dragging or choosing one sets the tool to `{ place: id }`; editing an object's parts opens the parts
    layout (drill-in).

- [ ] **Step 1: Failing tests** — `define`/`update` round-trip through `printScenes`/`readScenes`; `remove` of a placed
      object returns a problem and changes nothing; `extract` of two elements yields one element placing a new object
      whose parts hold both, with their links kept.
- [ ] **Step 2: Run, expect FAIL** — `pnpm --filter @dxos/scene exec vitest run --project=node src/model-intent.test.ts`.
- [ ] **Step 3: Implement.** SPEC decision (agent, for user): "The Library panel is the canvas model's objects." Fills
      in [D-27]; replaces the TASKS.md "Library panel" follow-up.
- [ ] **Step 4: Run, expect PASS**; verify the panel story and link it.
- [ ] **Step 5: Commit** `plugin-canvas: library of model objects`.

## Phase C — Solid tools and spacetime retirement

### Task 16: Solid intents

**Files:**

- Modify: `packages/common/scene/src/intent.ts`, `intent.test.ts`

**Interfaces:**

- Produces: `LayoutIntent` gains `extrude { id, target, face: Vec3, distance }`, `join { id, operands }`,
  `subtract { id, base, tool }`. Each creates an inline `solid` element whose operation tree is in `props` (`op`,
  `operands`, `target`, `face`, `distance`, as the `solid` exemplar writes them) and hides its operands. Operands that
  place objects are evaluated through `resolve3D`, so a solid over a library part follows edits to that part.

- [ ] **Step 1: Failing tests** — each intent's element round-trips through `printScenes`/`readScenes`; operands are
      hidden; deleting the solid unhides them; a cycle (`join` naming itself) is refused; a solid over an element that
      places an object evaluates that object's kind.
- [ ] **Step 2: Run, expect FAIL** — `pnpm --filter @dxos/scene exec vitest run --project=node src/intent.test.ts`.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run, expect PASS.**
- [ ] **Step 5: Commit** `scene: solid intents`.

### Task 17: Extrude, join and subtract tools

**Files:**

- Modify: `packages/ui/react-ui-scene/src/components/Scene3DEditor/*`, `packages/plugins/plugin-canvas/src/containers/SceneArticle/*`
- Test: `packages/ui/react-ui-scene/src/components/Scene3DEditor/gizmo.test.ts`

**Interfaces:**

- Produces: `Tool3D` gains `'extrude'`; `extrudeIntent(key: string, normal: Vec3, dragPixels: number, camera,
viewport): LayoutIntent`; toolbar actions Join and Subtract over the selection (subtract: the first selected is the
  base). "Make object" (Task 15 `extract`) turns a finished solid into a library object.

- [ ] **Step 1: Failing tests** — dragging a face along its normal by N pixels yields an `extrude` whose distance is the
      world length of N pixels at that depth; dragging against the normal yields a negative distance.
- [ ] **Step 2: Run, expect FAIL** — `pnpm --filter @dxos/react-ui-scene exec vitest run --project=node src/components/Scene3DEditor/gizmo.test.ts`.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run, expect PASS**; verify the story and link it.
- [ ] **Step 5: Commit** `react-ui-scene: solid tools`.

### Task 18: Mesh import and STL export

**Files:**

- Move: `packages/plugins/plugin-spacetime/src/engine/{obj-import.ts,obj-import.test.ts,glb-import.ts,stl-export.ts}` →
  `packages/ui/react-ui-scene/src/three/io/`
- Test: `packages/ui/react-ui-scene/src/three/io/{obj-import.test.ts,stl-export.test.ts}`

**Interfaces:**

- Produces: `importMesh(file: File, wasm): Effect.Effect<Scene.Object3D>` — a `mesh` object (geometry in
  `props.mesh = { vertices: number[]; indices: number[] }`) for the model, which the article places with one element,
  so a mesh is stored once however often it is placed; `exportSTL(doc: Scene.SceneDocument, layout: string, ids:
string[], wasm): ArrayBuffer` over the evaluated, resolved elements. Every call site of the moved functions is updated
  in the same commit (no re-exports).

- [ ] **Step 1: Failing tests** — an imported OBJ cube placed once renders as one item with 12 triangles; placed twice it
      is one object; STL export of the `solid` exemplar has the evaluated solid's triangle count.
- [ ] **Step 2: Run, expect FAIL** — `pnpm --filter @dxos/react-ui-scene exec vitest run --project=node src/three/io`.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run, expect PASS.**
- [ ] **Step 5: Commit** `react-ui-scene: mesh import and STL export`.

### Task 19: Retire plugin-spacetime

**Files:**

- Delete: `packages/plugins/plugin-spacetime/`
- Modify: `packages/apps/composer-app/src/plugin-defs.tsx`, `packages/apps/composer-app/package.json`, every other
  dependent (`grep -rn "plugin-spacetime" --include=package.json packages tools`), `pnpm-lock.yaml`

- [ ] **Step 1:** List dependents; confirm parity: select, move, extrude, join, subtract, GLB/OBJ import and STL export
      each have a test in Tasks 12–18.
- [ ] **Step 2:** Remove the plugin and its references; `pnpm install` (background) and revert `pnpm-workspace.yaml` if
      it changes.
- [ ] **Step 3:** `moon run composer-app:build` (background) and `pnpm knip` → no new findings.
- [ ] **Step 4:** Changeset naming the removal. Commit `plugin-spacetime: retire in favour of the 3D canvas`.

## Phase D — Assistant

### Task 20: ReadScene and EditScene operations

**Files:**

- Modify: `packages/plugins/plugin-canvas/src/types/CanvasOperation.ts`, `operations/CanvasOperationHandlerSet.ts`,
  `packages/common/diagram/src/dsl/scene-model.ts` (keyword object ids)
- Create: `packages/plugins/plugin-canvas/src/operations/scene.ts`
- Test: `packages/plugins/plugin-canvas/src/operations/scene.test.ts`, `packages/common/diagram/src/dsl/scene-model.test.ts`

**Interfaces:**

- Consumes: `Dsl.readScenes`/`Dsl.printScenes`, Task 4 `canvasDocument`, Task 13 `applyLayoutIntent`, Task 15
  `applyModelIntent`.
- Produces:
  - `ReadScene` — key `org.dxos.operation.canvas.readScene`; input `{ drawing: Ref<Drawing.Drawing> }`; output
    `{ dx: string }` — the canvas's whole document (scenes, layouts, models).
  - `EditScene` — key `org.dxos.operation.canvas.editScene`; input `{ drawing: Ref<Drawing.Drawing>; dx: string }`;
    output `{ problems: { part: 'scene' | 'layout' | 'model'; id: string; element?: string; message: string }[] }`.
    It diffs the stored and the given document into one `batch` per layout, model intents per model, and camera
    updates per scene, applied in one change so undo reverts one edit; new layouts, models and scenes are created and
    listed on the `Canvas`.
  - `readScenes` reports an object id that is a DSL keyword (closes that TASKS.md follow-up).
  - These are separate from the illustrator `Read`/`Edit` operations, which speak the semantic diagram DSL and reach a
    canvas through its builder (Task 9).

- [ ] **Step 1: Failing tests** — `ReadScene` on each exemplar drawing returns text that `readScenes` reads back equal;
      `EditScene` moving one element changes only that element; text with a problem writes nothing and returns it
      (Review Focus 5); removing a layout that an object's `parts` still names is a problem; an object named `node`
      is reported by `readScenes`.
- [ ] **Step 2: Run, expect FAIL** — `pnpm --filter @dxos/plugin-canvas exec vitest run --project=node src/operations/scene.test.ts`
      and `pnpm --filter @dxos/diagram exec vitest run --project=node src/dsl/scene-model.test.ts`.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run, expect PASS.**
- [ ] **Step 5: Commit** `plugin-canvas: read and edit scenes as DSL`.

### Task 21: Scene skill

**Files:**

- Create: `packages/plugins/plugin-canvas/src/skills/SceneSkill.ts`
- Modify: `packages/plugins/plugin-canvas/src/skills/index.ts`, `capabilities/skill-definition.ts`
- Test: `packages/plugins/plugin-canvas/src/skills/SceneSkill.test.ts`

**Interfaces:**

- Produces: a skill whose instructions (via `trim`) describe the `scene`, `layout` and `model` blocks and their
  `camera`, `element` and `object` statements: kinds per dimension, an element placing an object versus an inline
  kind, bindings, groups and `arrange`, composite objects with `parts`, and solids; with one 2D and one 3D example from
  `EXEMPLARS`; tools `ReadScene`, `EditScene`.

- [ ] **Step 1: Failing test** — the skill lists exactly the two operations, and every `.dx` example in its
      instructions reads with no problems.
- [ ] **Step 2: Run, expect FAIL** — `pnpm --filter @dxos/plugin-canvas exec vitest run --project=node src/skills/SceneSkill.test.ts`.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run, expect PASS.**
- [ ] **Step 5: Commit** `plugin-canvas: scene skill`.

## Self-review

- **Spec coverage:** design §1 (2D on the model) → Tasks 1–2, 6–9; decisions 10 and 14 / D-26–D-27 (drawing, canvas,
  model, layouts, scenes) → 3–5, 9, 14; §2 intents → 10, 16 (layout) and 15 (model); §3 viewports and picking → 11,
  12; §4 panels → 9 (scenes list, Properties), 14 (3D Properties), 15 (Library, now in scope); §5 migration → 4; §6
  order → phases A–D; decision 12 → 19; decision 13 → 6–8 before 9; decision 8 → 12; decision 9 → 14 (orbit writes the
  scene camera; stages still sample, D-28); D-29 drill-in → 2 (2D Views), 12 (3D); decision 7 → 20–21.
- **TASKS.md follow-ups folded in:** parts edits reaching a playing stage → 2; `fromEcho` reading every canvas scene
  → 4 (`canvasDocument`); keyword object ids → 20; Library panel → 15. The others stay follow-ups.
- **Type consistency:** `LayoutIntent`, `applyIntent`, `ModelIntent`, `applyModelIntent`, `applyLayoutIntent`,
  `layoutSource`, `bindLayoutStore`, `BoundLayoutStore`, `reachedObjects`, `openScene`, `canvasDocument`,
  `deleteScene`, `createCanvas`, `variantFor`, `migrateSceneDrawing`, `targetOf`, `Tool3D` are named the same in every
  task; 3D elements use `center` (D-24); `Problem` is `{ part, id, element?, message }`.
- **Review Focus:** each of the five has a named test (Tasks 4, 2 and 4, 13, 12, 20).
