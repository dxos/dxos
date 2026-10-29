# Scene Editor (Stage 3) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** One editor, grown inside plugin-canvas, edits 2D and 3D drawings stored as Model, Layout and Scene objects
(`Model2D`/`Layout2D`/`Scene2D` and their 3D twins), so today's canvas becomes its 2D case, plugin-spacetime is retired,
and the assistant edits drawings through the `.dx` DSL.

**Architecture:** react-ui-canvas keeps its `View`/`ViewStore`/`VersionedSource` engine; a lossless adapter backs its
`ViewStore` with `Layout2D` ECHO objects (a View is a layout; its camera is a `Scene2D`), so the 2D mechanism depends
only on `@dxos/scene` (decision 5). 3D gets a shared `SceneIntent` reducer over layout records in `@dxos/scene`, a
picking contract on `SceneRenderer3D`, Babylon `GizmoManager` handles and a `VersionedSource` over `Layout3D` for undo.
Every drawing is a plugin-illustrator `Drawing`; its existing `canvas` Ref is widened to name either the unchanged
`Drawing.Canvas` (tldraw, excalidraw) or plugin-canvas's typed `Canvas`, which holds the metadata, named style classes,
its model, layouts and scenes; the scene's type picks the viewport (decisions 10, 14; SPEC D-26, D-27).

**Tech Stack:** TypeScript, Effect Schema, ECHO (`@dxos/echo`), effect-atom, React, Babylon.js, manifold-3d, vitest.

**Spec:** `agents/superpowers/specs/2026-10-28-scene-editor-design.md` (decisions 1–13; no open questions); model spec
`packages/common/scene/SPEC.mdl` (D-1…D-33); stage 2 design
`agents/superpowers/specs/2026-10-28-scene-model-design.md`.

**Model terms (2026-10-29, D-27..D-33):** elements live in a **Layout** (`LayoutRecord2D/3D`, ECHO `Layout2D/3D`), a
**Scene** is a layout plus a camera (`SceneRecord2D/3D`, ECHO `Scene2D/3D`, holding `layout: Ref`), and a **Model**
(`Model2D/3D`) holds reusable objects that elements place (`element.object`); a composite object's `parts` is a nested
layout, which replaces child scenes and `child` Refs. Records resolve against their model with `resolveLayout2D/3D`.
Where a task below says an element is in a scene, it is in the scene's layout.

## Global Constraints

- The editor grows inside plugin-canvas; no new editor plugin (decision 1).
- The plugin owns a canvas object for its metadata; editing, rendering and animation depend only on `Scene` (decision 5).
- Every drawing is a `Drawing`; `Drawing.canvas` is a Ref to either the existing `Drawing.Canvas` (tldraw and
  excalidraw, structurally unchanged) or plugin-canvas's `Canvas`. `Canvas` holds the metadata, named style classes,
  `model?: Ref<Model>`, `layouts: Ref<Layout>[]` and `scenes: Ref<Scene>[]`; a scene's type picks the viewport
  (decisions 6, 10, 14; D-26, D-27).
- plugin-canvas switches to `Scene2D` only when every react-ui-canvas mode runs on it: free (freehand), lattice,
  constrained and scored — and dynamic, which is also a projection mode (decision 12).
- plugin-spacetime is deleted within stage 3 once each of its tools has a test in the new editor (decision 11).
- 3D handles are Babylon's `GizmoManager` (decision 8). The 3D viewer orbits; in an animator stage the animation drives
  the camera (decision 9).
- tldraw and excalidraw drawings do not change or migrate. Only scene canvases (`dxos.org/scene/2`) migrate, into a
  `Canvas` plus `Layout2D`, `Scene2D` and `Model2D` objects. plugin-spacetime data does not migrate.
- Playback samples a scene's layout and never writes it back (D-28).
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
   type it does not know and must show "update to open" rather than create an empty canvas over the migrated content.
2. Linked drawings (portal frames) whose target is not migrated yet: the scene store must open them read-through, not
   drop them.
3. Undo across an ECHO-backed `Scene3D` after a remote edit to the same element: `patchSource` must skip, not clobber.
4. A gizmo drag on an element inside a composite's parts: the intent must target the parts layout, not the root layout.
5. `EditScene` given DSL text with problems: no partial write; problems return to the caller.

---

## Phase A — Model switch (2D on Layout2D and Scene2D)

### Task 1: Lossless View ⇄ Layout2D mapping

**Files:**

- Modify: `packages/ui/react-ui-scene/src/canvas/adapter.ts`
- Test: `packages/ui/react-ui-scene/src/canvas/adapter.test.ts`

**Interfaces:**

- Consumes: `toCanvasViews(doc: Scene.SceneDocument)` (exists), react-ui-canvas `View`, `Node`, `Link`, `Layer`.
- Produces:
  - `toCanvasView(doc: Scene.SceneDocument, layout: Scene.LayoutRecord2D): View`
  - `fromCanvasView(view: View): Scene.LayoutRecord2D`
  - Node fields with no `Element2D` field are kept under `element.props.canvas`; View-level fields (`layers`, `kind`,
    `anonymous`) under the layout's new `props.canvas` (Step 3); a portal node becomes an element placing a composite
    object whose `parts` is the portal's view.

- [ ] **Step 1: Write the failing tests**

```ts
test('round-trips every node type and link shape in the canvas samples', () => {
  for (const view of sampleViews()) {
    expect(toCanvasView(fromCanvasView(view))).toEqual(withLegacyView(view));
  }
});
test('keeps a node field Element2D has no slot for under props.canvas', () => {
  const layout = fromCanvasView(
    viewWith({
      type: 'rect',
      id: 'a',
      center: { x: 0, y: 0 },
      size: { width: 64, height: 64 },
      text: { align: 'left' },
    }),
  );
  expect(layout.elements.a.props?.canvas).toMatchObject({ text: { align: 'left' } });
});
test('maps z to order and a link endpoint to a binding', () => {
  /* order === node.z; from.element === source.node */
});
```

`sampleViews()` reads the Views of `@dxos/react-ui-canvas/testing` sample scenes (every registered node type, every
link `type`).

- [ ] **Step 2: Run, expect FAIL** — `pnpm --filter @dxos/react-ui-scene exec vitest run --project=node src/canvas/adapter.test.ts` → `fromCanvasView is not a function`.
- [ ] **Step 3: Implement.** Layers and `kind`/`anonymous` (View-level fields) go in a reserved layout-level record:
      add `props?: Record<string, unknown>` to `makeLayoutSchema` in `@dxos/scene` (`Scene.ts`), with SPEC decision
      "Layouts carry renderer-specific props, as elements do." `toCanvasViews` maps each 2D layout with
      `toCanvasView`.
- [ ] **Step 4: Run, expect PASS** (same command), plus `pnpm --filter @dxos/scene exec vitest run --project=node`.
- [ ] **Step 5: Commit** `react-ui-scene: lossless View and Layout2D mapping`.

### Task 2: A ViewStore backed by Layout2D objects

**Files:**

- Create: `packages/plugins/plugin-canvas/src/model/scene-store.ts`
- Test: `packages/plugins/plugin-canvas/src/model/scene-store.test.ts`

**Interfaces:**

- Consumes: Task 1 `toCanvasView`/`fromCanvasView`; `Scene.Scene2D`, `Scene.Layout2D`, `Scene.Model2D`;
  react-ui-canvas `ViewStore`, `VersionedSource`.
- Produces: `bindSceneStore(registry: Registry.AtomRegistry, scene: Scene.Scene2D): BoundSceneStore` where
  `BoundSceneStore = { store: ViewStore; root: ViewId; dispose: () => void }`. View ids are layout `key`s; the root is
  the scene's layout, and parts layouts are reached through the model's composite objects' `parts` Refs and loaded on
  demand.

- [ ] **Step 1: Failing tests**

```ts
test('a node moved through the store is written to the Layout2D element', ...);  // elements.a.center updated
test('an ECHO edit to the Layout2D reaches the View atom', ...);                   // registry.get(store.view(root)).nodes.a
test("a composite's parts layout opens as its own View", ...);                     // store.view('b-detail') defined
test('versions.read at earlier heads returns the earlier View', ...);             // undo reads the past
test('an unchanged element is not rewritten when another moves', ...);           // per-element writes, so ECHO merges by element
```

Use `EchoTestBuilder` with `Scene.Scene2D`, `Scene.Layout2D` and `Scene.Model2D` registered.

- [ ] **Step 2: Run, expect FAIL** — `pnpm --filter @dxos/plugin-canvas exec vitest run --project=node src/model/scene-store.test.ts`.
- [ ] **Step 3: Implement.** Writes diff the new View against the old (`diffPaths`) and write only changed elements via
      `Obj.change`; `versions` maps `[viewId, 'nodes', id, …]` paths onto `elements.<id>` and reads past values with
      the object's heads, as `bindCanvasStore` does for content records.
- [ ] **Step 4: Run, expect PASS.**
- [ ] **Step 5: Commit** `plugin-canvas: ViewStore over Layout2D objects`.

### Task 3: `Drawing.canvas` accepts either canvas type

**Files:**

- Modify: `packages/plugins/plugin-illustrator/src/types/Drawing.ts`, `IllustratorCapabilities.ts`
- Test: `packages/plugins/plugin-illustrator/src/types/Drawing.test.ts` (create)

**Interfaces:**

- Produces:
  - `Drawing.Drawing.canvas` becomes `Ref.Ref(Obj.Unknown)`: a `Drawing.Canvas` (tldraw, excalidraw) or a plugin-canvas
    `Canvas.Canvas`. `Drawing.make({ name, canvas }: { name?: string; canvas: Obj.Any }): Drawing`. `Drawing.Canvas`,
    `makeCanvas` and `isCanvas` are unchanged, and so are the tldraw and excalidraw plugins.
  - `DrawingVariant` gains optional `canvasType?: Type.AnyObj`; a variant without one keeps matching by
    `Drawing.Canvas.schema`, as today.
  - `variantFor(canvas: Obj.Any, variants: readonly DrawingVariant[]): DrawingVariant | undefined` — by `canvasType`
    typename first, then by `schema` for a `Drawing.Canvas`.

- [ ] **Step 1: Failing tests** — a tldraw drawing made the current way resolves the tldraw variant unchanged; a
      `Drawing` whose canvas is a `Canvas.Canvas` resolves the canvas variant; a query for `Drawing.Drawing` returns
      tldraw, excalidraw and canvas drawings together (decision 10).
- [ ] **Step 2: Run, expect FAIL** — `pnpm --filter @dxos/plugin-illustrator exec vitest run --project=node src/types/Drawing.test.ts`.
- [ ] **Step 3: Implement.** Call sites that read `drawing.canvas` as a `Drawing.Canvas` go through `variantFor` or
      `Drawing.isCanvas`.
- [ ] **Step 4: Run, expect PASS**, plus `pnpm --filter @dxos/plugin-tldraw exec vitest run --project=node` and
      `pnpm --filter @dxos/plugin-excalidraw exec vitest run --project=node` (unchanged); typecheck all three packages.
- [ ] **Step 5: Commit** `plugin-illustrator: a drawing's canvas may be any canvas type`.

### Task 4: The plugin-canvas Canvas type and its migration

**Files:**

- Modify: `packages/plugins/plugin-canvas/src/types/Canvas.ts`, `model/store.ts` (`createCanvas`),
  `capabilities/drawing-variant.ts`
- Create: `packages/plugins/plugin-canvas/src/model/migrate-scenes.ts`
- Test: `packages/plugins/plugin-canvas/src/model/migrate-scenes.test.ts`, `src/model/content.test.ts`

**Interfaces:**

- Consumes: Task 1 `fromCanvasView`; Task 3 `variantFor`/`canvasType`; the v2 reader in `store.ts`.
- Produces:
  - `Canvas.Canvas` — DXN `org.dxos.type.canvas.canvas@0.1.0`, `{ settings: CanvasSettings; styles?: Record<string, StyleClass>; model?: Ref.Ref(Obj.Unknown); layouts: Ref.Ref(Obj.Unknown)[]; scenes: Ref.Ref(Obj.Unknown)[] }`,
    where `CanvasSettings` is today's `CanvasRecord` minus `kind` and `root` (lattice, grid, readonly, theme, styleSet,
    background, backgroundGrid, diagramShapes).
  - `createCanvas(settings?: Partial<CanvasSettings> & { dimension?: Scene.Dimension }): { canvas: Canvas.Canvas; scene: Scene.Scene2D | Scene.Scene3D; layout: Scene.Layout2D | Scene.Layout3D }` — one empty layout and one scene over it
  - `canvasScene(canvas: Canvas.Canvas): Scene.Scene2D | Scene.Scene3D | undefined` — the first scene, which opens
  - `migrateSceneDrawing(drawing: Drawing.Drawing): Effect.Effect<boolean, Error, Database.Service>` — for a drawing
    whose canvas is a `Drawing.Canvas` with schema `dxos.org/scene/2`: one `Layout2D` and one `Scene2D` per view, a
    `Model2D` whose composite objects hold the views portals open as `parts`, the canvas record's settings and the
    legacy `styles` onto a new `Canvas`, and
    `drawing.canvas` repointed to it in one change; returns whether it changed anything. Any other drawing is left as
    it is.

- [ ] **Step 1: Failing tests**

```ts
test('createCanvas() makes a Canvas with a Scene2D over a Layout2D; dimension 3d makes 3D ones', ...);
test('every sample canvas reads the same Views before and after migration', ...); // bindCanvasStore(legacy) vs bindSceneStore
test('running it twice changes nothing the second time', ...);
test('a tldraw drawing is left as it is', ...);
test('a portal frame becomes an element placing a composite object whose parts are its view', ...);
test('named style classes and settings move onto the Canvas', ...);
test('a lattice canvas keeps lattice: true in its settings', ...);
```

Samples: `packages/plugins/plugin-canvas/src/samples/*`.

- [ ] **Step 2: Run, expect FAIL** — `pnpm --filter @dxos/plugin-canvas exec vitest run --project=node src/model/migrate-scenes.test.ts`.
- [ ] **Step 3: Implement.** ECHO's `Migration.define` maps one type to one type and `Migration.defineContent` cannot
      create objects, so this runs when a scene drawing is opened for writing (the article surface) and from a
      space-level `MigrateDrawings` operation; a read-only viewer reads the legacy canvas (Review Focus 1). SPEC decision
      (agent, for user): "plugin-canvas's `Canvas` keeps settings and style classes; elements live in its layouts."
      Fills in D-26 and D-27. The existing `dxos.org/scene/1 → 2` content migration stays, so a v1
      canvas reaches v2 before this one runs.
- [ ] **Step 4: Run, expect PASS.**
- [ ] **Step 5: Commit** `plugin-canvas: Canvas type over model, layouts and scenes, migrated from scene canvases`.

### Task 5: Convert to and from a canvas through Scene2D

**Files:**

- Modify: `packages/plugins/plugin-illustrator/src/operations/convert.ts`, `packages/plugins/plugin-canvas/src/capabilities/drawing-variant.ts`
- Test: `packages/plugins/plugin-illustrator/src/operations/convert.test.ts`

**Interfaces:**

- Consumes: Tasks 3–4.
- Produces: the existing `Convert` operation and `DrawingConverter` keep their shape for tldraw ⇄ excalidraw; when the
  canvas variant is the source or target, its converter reads or writes the `Scene2D` under `Canvas.content` (the
  pivot) instead of `Drawing.Canvas` content records.

- [ ] **Step 1: Failing tests** — tldraw → canvas yields a `Drawing` whose `Canvas` holds a `Scene2D` with the converted
      shapes; canvas → excalidraw reads them back out; tldraw → excalidraw is unchanged.
- [ ] **Step 2: Run, expect FAIL** — `pnpm --filter @dxos/plugin-illustrator exec vitest run --project=node src/operations/convert.test.ts`.
- [ ] **Step 3–5:** implement, PASS, commit `plugin-canvas: convert drawings through Scene2D`.

### Task 6: Lattice mode on Scene2D

**Files:**

- Modify: `packages/plugins/plugin-canvas/src/containers/CanvasArticle/CanvasArticle.tsx` (projection choice reads
  `canvas.settings.lattice`)
- Test: `packages/plugins/plugin-canvas/src/model/scene-store.test.ts`, `packages/ui/react-ui-canvas/src/engine/projections/lattice.test.ts`

**Interfaces:**

- Consumes: Task 2 `bindSceneStore`, Task 4 `Canvas.settings`; react-ui-canvas `createLatticeProjection`.
- Produces: no new API — the lattice projection runs over the `ViewStore` that `bindSceneStore` returns.

- [ ] **Step 1: Failing tests** — the lattice projection tests re-run with a store from `bindSceneStore` over each lattice
      sample: a move lands on whole cells, a resize spans whole cells, links route along gutters, and the result is
      written to `Scene2D` elements.
- [ ] **Step 2: Run, expect FAIL** — `pnpm --filter @dxos/plugin-canvas exec vitest run --project=node src/model/scene-store.test.ts`.
- [ ] **Step 3–5:** implement, PASS, commit `plugin-canvas: lattice canvases on Scene2D`.

### Task 7: Constrained and dynamic modes on Scene2D

**Files:**

- Modify: `packages/ui/react-ui-canvas/src/engine/projections/constrained.ts`, `dynamic.ts`
- Create: `packages/plugins/plugin-canvas/src/model/projection-model.ts`
- Test: `packages/plugins/plugin-canvas/src/model/projection-model.test.ts`

**Interfaces:**

- Consumes: Task 1 scene-level `props`.
- Produces: `sceneModelSource<M>(scene: Scene.Scene2D, key: 'constrained' | 'dynamic', schema: Schema.Schema<M>): VersionedSource`
  — keeps a projection's own model (`ConstrainedModel`, the dynamic graph) under `scene.props.<key>`, so it persists and
  undo patches it; `createConstrainedProjection` and `createDynamicProjection` accept it as their `model` source in place
  of `atomSource`.

- [ ] **Step 1: Failing tests** — a constrained move rewrites the stored constraints and survives reopening the scene;
      undo restores the earlier constraints; the dynamic projection's graph round-trips the same way.
- [ ] **Step 2: Run, expect FAIL** — `pnpm --filter @dxos/plugin-canvas exec vitest run --project=node src/model/projection-model.test.ts`.
- [ ] **Step 3: Implement.** SPEC decision (agent): "A projection's own model lives in the scene's props." Add a
      canvas setting `projection?: 'freehand' | 'lattice' | 'constrained' | 'dynamic'` (lattice keeps its flag as an
      alias) so a canvas opens in its mode.
- [ ] **Step 4–5:** PASS (plus `pnpm --filter @dxos/react-ui-canvas exec vitest run --project=node src/engine/projections`),
      commit `plugin-canvas: constrained and dynamic canvases on Scene2D`.

### Task 8: Scored mode on Scene2D

**Files:**

- Modify: `packages/ui/react-ui-canvas/src/components/Canvas/Scored.stories.tsx`
- Test: `packages/plugins/plugin-canvas/src/model/scene-store.test.ts`

**Interfaces:**

- Consumes: Task 2; `@dxos/diagram` `Score`, `Objective`, `Diagnostics`; react-ui-canvas `toDiagramObjects`,
  `diagnosticElements`.
- Produces: no new API — scoring reads the Views a `Scene2D`-backed store emits.

- [ ] **Step 1: Failing test** — for each scored sample, `Score` over the View from `bindSceneStore` equals `Score` over
      the View from a memory store of the same scene.
- [ ] **Step 2–5:** FAIL with `pnpm --filter @dxos/plugin-canvas exec vitest run --project=node src/model/scene-store.test.ts`,
      implement (the story builds its store with `bindSceneStore`), PASS, verify the Scored story and link it, commit
      `react-ui-canvas: scored canvases on Scene2D`.

### Task 9: plugin-canvas edits through the scene store

**Files:**

- Modify: `packages/plugins/plugin-canvas/src/containers/CanvasArticle/use-canvas-scene.ts`, `CanvasArticle.tsx`,
  `CanvasCard/CanvasCard.tsx`, `CanvasStage/CanvasStage.tsx`, `CanvasProperties/*`
- Modify: `packages/plugins/plugin-canvas/src/operations/apply.ts`, `patch-store.ts`, `capabilities/animator-stage.ts`
- Test: `packages/plugins/plugin-canvas/src/containers/CanvasArticle/use-canvas-scene.test.ts` (create),
  `packages/plugins/plugin-canvas/src/operations/operations.test.ts`

**Interfaces:**

- Consumes: Tasks 2–8.
- Produces: `useCanvasScene(canvas: Canvas.Canvas)` returns the same shape as today, backed by `bindSceneStore` in every
  mode; `bindCanvasStore` is kept only as the legacy reader Task 4's migration uses.

- [ ] **Step 1: Failing tests** — opening a legacy sample drawing migrates it and edits its `Scene2D`; the `Apply` and
      `Patch` operations write `Scene2D` elements; StyleClassList edits `Canvas.styles`.
- [ ] **Step 2: Run, expect FAIL** — `pnpm --filter @dxos/plugin-canvas exec vitest run --project=node src/operations/operations.test.ts`.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run the whole package**: `pnpm --filter @dxos/plugin-canvas exec vitest run --project=node` → all pass;
      then `moon run react-ui-canvas:test-browser` (playwright specs) → unchanged.
- [ ] **Step 5: Verify in storybook** — `CanvasArticle` stories in each mode render and edit; link each story.
- [ ] **Step 6: Commit** `plugin-canvas: edit canvases as Scene2D`.

## Phase B — 3D viewport and arranging

### Task 10: Shared scene intents

**Files:**

- Create: `packages/common/scene/src/intent.ts`
- Test: `packages/common/scene/src/intent.test.ts`
- Modify: `packages/common/scene/src/index.ts`, `SPEC.mdl`

**Interfaces:**

- Produces:
  - `SceneIntent` (Schema union, `kind` tag): `create { element }`, `delete { ids }`, `update { id, path: string[], value }`,
    `reorder { id, order }`, `group { id, members, arrange? }`, `ungroup { id }`, `bind { link: Element }`,
    `move { ids, delta: Vec2 | Vec3 }`, `rotate { ids, delta: number | Vec3 }`, `scale { ids, factor: Size2 | Vec3 }`,
    `batch { intents }`.
  - `applyIntent<L extends LayoutRecord>(layout: L, intent: SceneIntent): L` — pure; geometric intents dispatch on
    `layout.dim`.
  - `isSceneIntent: (value: unknown) => value is SceneIntent`.

- [ ] **Step 1: Failing tests**

```ts
test('move adds a Vec3 delta to each 3D center and rounds to 0.001', ...);
test('rotate adds Euler degrees; scale multiplies per axis', ...);
test('delete removes the elements and every link bound to them', ...);
test('group adds a group element over its members; ungroup removes it and keeps the members', ...);
test('a move of a pinned-by-layout member sets pinned', ...);
test('an intent naming a missing id returns the scene unchanged', ...);
test('isSceneIntent refuses a 2D delta on a 3D move', ...);
test('batch applies its intents in order', ...);
```

- [ ] **Step 2: Run, expect FAIL** — `pnpm --filter @dxos/scene exec vitest run --project=node src/intent.test.ts`.
- [ ] **Step 3: Implement.** SPEC decision (agent): "Scenes are edited by `SceneIntent`s; one reducer, geometry by
      dimension." 2D keeps react-ui-canvas's own `Intent` in stage 3 — converging the two is a follow-up in TASKS.md.
- [ ] **Step 4: Run, expect PASS.**
- [ ] **Step 5: Commit** `scene: shared scene intents`.

### Task 11: Picking

**Files:**

- Modify: `packages/ui/react-ui-scene/src/three/camera.ts`, `renderer.ts`
- Test: `packages/ui/react-ui-scene/src/three/camera.test.ts`, `renderer.test.ts`

**Interfaces:**

- Produces:
  - `groundPoint(camera: Scene.Camera3D, viewport: Viewport, screen: { x: number; y: number }, height = 0): Scene.Vec3 | undefined`
  - `SceneRenderer3D.pick(screen: { x: number; y: number }): { element?: string; point?: Scene.Vec3; normal?: Scene.Vec3 }`
    — `element` is the render-list key (`<scene>/<id>` for child-scene items), `normal` the picked face's world normal.

- [ ] **Step 1: Failing tests** — `groundPoint` is the inverse of `project` for points on y=0 (perspective and
      orthographic); returns undefined when the ray is parallel to or points away from the plane. Renderer (Babylon
      `NullEngine`, as `renderer.test.ts` does): picking the screen centre over a cube at the origin returns its key;
      over empty space returns only a ground point.
- [ ] **Step 2: Run, expect FAIL** — `pnpm --filter @dxos/react-ui-scene exec vitest run --project=node src/three/camera.test.ts src/three/renderer.test.ts`.
- [ ] **Step 3: Implement.** Tag meshes with `metadata.key`; pick with `scene.pick`. If `NullEngine` cannot pick, test
      `pick` through a pure ray–box function and record a ruling.
- [ ] **Step 4: Run, expect PASS.**
- [ ] **Step 5: Commit** `react-ui-scene: pick elements and ground points`.

### Task 12: Scene3DEditor with GizmoManager

**Files:**

- Create: `packages/ui/react-ui-scene/src/components/Scene3DEditor/{Scene3DEditor.tsx,gizmo.ts,gizmo.test.ts,Scene3DEditor.stories.tsx,index.ts}`

**Interfaces:**

- Consumes: Task 10 `SceneIntent`, Task 11 `pick`; `Scene3DView`'s renderer setup (extract a shared `useRenderer` hook
  from `Scene3DView.tsx` rather than duplicate it).
- Produces:
  - `Scene3DEditorProps = { document: Scene.SceneDocument; selection: readonly string[]; tool: Tool3D; onSelect: (ids: string[]) => void; onIntent: (intent: Scene.SceneIntent) => void }`
  - `Tool3D = 'select' | 'move' | 'rotate' | 'scale' | 'link' | { create: string }`
  - `gizmoIntent(mode: 'move' | 'rotate' | 'scale', id: string, before: Scene.Element3D, after: { center: Vec3; rotation: Vec3; scale: Vec3 }): Scene.SceneIntent | undefined`
  - `SceneRenderer3D.attachGizmo(key: string | undefined, mode, onEnd: (after) => void): void`

- [ ] **Step 1: Failing tests** (`gizmo.test.ts`): a move gizmo drag yields a `move` with the center delta; rotate
      yields degrees; scale yields per-axis factors; an unchanged transform yields undefined; an element in a child
      composite's parts yields an intent whose ids name the parts element (Review Focus 4: `onIntent` receives the
      parts layout's id — make the prop `onIntent: (layout: string, intent: SceneIntent) => void`).
- [ ] **Step 2: Run, expect FAIL** — `pnpm --filter @dxos/react-ui-scene exec vitest run --project=node src/components/Scene3DEditor/gizmo.test.ts`.
- [ ] **Step 3: Implement.** Click selects (shift toggles); empty click clears; `{ create: kind }` places a unit element
      at `groundPoint`; `link` binds the first and second clicked elements. Orbit stays on the middle/right button
      while a tool other than `select` owns the left.
- [ ] **Step 4: Run, expect PASS.** Story with every exemplar; verify in the browser pane and link the story.
- [ ] **Step 5: Commit** `react-ui-scene: 3D editor viewport with gizmos`.

### Task 13: Undo over Layout3D

**Files:**

- Create: `packages/plugins/plugin-canvas/src/model/scene3d-source.ts`
- Test: `packages/plugins/plugin-canvas/src/model/scene3d-source.test.ts`

**Interfaces:**

- Produces: `layout3dSource(layout: Scene.Layout3D): VersionedSource` (paths `['elements', id, …]`) and
  `applySceneIntent(layout: Scene.Layout2D | Scene.Layout3D, intent: Scene.SceneIntent): void` — applies via `applyIntent`
  and writes only changed elements in one `Obj.change`.

- [ ] **Step 1: Failing tests** — apply, undo (react-ui-canvas `recordChanges` + `patchSource`) restores elements, redo
      reapplies; a remote edit to the same element after the change makes undo skip it (`skipped: 1`).
- [ ] **Step 2: Run, expect FAIL** — `pnpm --filter @dxos/plugin-canvas exec vitest run --project=node src/model/scene3d-source.test.ts`.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run, expect PASS.**
- [ ] **Step 5: Commit** `plugin-canvas: undo for 3D scenes`.

### Task 14: The 3D canvas article

**Files:**

- Create: `packages/plugins/plugin-canvas/src/containers/Scene3DArticle/{Scene3DArticle.tsx,Scene3DArticle.stories.tsx,index.ts}`
- Modify: `packages/plugins/plugin-canvas/src/capabilities/react-surface.tsx`, create-object flow, `translations.ts`
- Test: `packages/plugins/plugin-canvas/src/plugin.test.ts`

**Interfaces:**

- Consumes: Tasks 4, 12, 13.
- Produces: the article surface picks `CanvasArticle` or `Scene3DArticle` from `canvasScene(canvas)`'s type; a toolbar
  (`useMenuActions` + `Menu.Root`, one `Toolbar.Root`) with select, move/rotate/scale, create cube/sphere/cylinder/cone,
  link, group, ungroup, delete, undo, redo; a Properties panel as a `Form` over `Scene.Element3D`; "New 3D canvas" in
  the create flow (`createCanvas({ dimension: '3d' })`, wrapped in a `Drawing`).

- [ ] **Step 1: Failing test** — the plugin's create operation with `dimension: '3d'` yields a `Drawing` whose `Canvas`
      content is a `Scene3D`; the surface resolver returns the 3D article for it.
- [ ] **Step 2: Run, expect FAIL** — `pnpm --filter @dxos/plugin-canvas exec vitest run --project=node src/plugin.test.ts`.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run, expect PASS**; typecheck `npx tsc --noEmit -p tsconfig.json`; story verified and linked.
- [ ] **Step 5: Commit** `plugin-canvas: 3D canvas article`.

## Phase C — Solid tools and spacetime retirement

### Task 15: Solid intents

**Files:**

- Modify: `packages/common/scene/src/intent.ts`, `intent.test.ts`

**Interfaces:**

- Produces: `SceneIntent` gains `extrude { id, target, face: Vec3, distance }`, `join { id, operands }`,
  `subtract { id, base, tool }`. Each creates a `solid` element with an operation tree in `props` (`op`, `operands`,
  `target`, `face`, `distance`, as the `solid` exemplar writes them) and hides its operands.

- [ ] **Step 1: Failing tests** — each intent's element round-trips through `printScenes`/`readScenes`; operands are
      hidden; deleting the solid unhides its operands; a cycle (`join` naming itself) is refused.
- [ ] **Step 2: Run, expect FAIL** — `pnpm --filter @dxos/scene exec vitest run --project=node src/intent.test.ts`.
- [ ] **Step 3–5:** implement, PASS, commit `scene: solid intents`.

### Task 16: Extrude, join and subtract tools

**Files:**

- Modify: `packages/ui/react-ui-scene/src/components/Scene3DEditor/*`, `packages/plugins/plugin-canvas/src/containers/Scene3DArticle/*`
- Test: `packages/ui/react-ui-scene/src/components/Scene3DEditor/gizmo.test.ts`

**Interfaces:**

- Produces: `Tool3D` gains `'extrude'`; `extrudeIntent(key: string, normal: Vec3, dragPixels: number, camera, viewport): SceneIntent`;
  toolbar actions Join and Subtract over the selection (subtract: first selected is the base).

- [ ] **Step 1: Failing tests** — dragging a face along its normal by N pixels yields an `extrude` whose distance is the
      world length of N pixels at that depth; dragging against the normal yields a negative distance.
- [ ] **Step 2–5:** FAIL with `pnpm --filter @dxos/react-ui-scene exec vitest run --project=node src/components/Scene3DEditor/gizmo.test.ts`,
      implement, PASS, verify the story, commit `react-ui-scene: solid tools`.

### Task 17: Mesh import and STL export

**Files:**

- Move: `packages/plugins/plugin-spacetime/src/engine/{obj-import.ts,obj-import.test.ts,glb-import.ts,stl-export.ts}` →
  `packages/ui/react-ui-scene/src/three/io/`
- Test: `packages/ui/react-ui-scene/src/three/io/{obj-import.test.ts,stl-export.test.ts}`

**Interfaces:**

- Produces: `importMesh(file: File, wasm): Effect.Effect<Scene.Element3D>` (a `mesh` element; geometry in
  `props.mesh = { vertices: number[]; indices: number[] }`); `exportSceneSTL(doc: Scene.SceneDocument, ids: string[], wasm): ArrayBuffer`
  over evaluated solids. Every call site of the moved functions is updated in the same commit (no re-exports).

- [ ] **Step 1: Failing tests** — an imported OBJ cube renders as one item with 12 triangles; STL export of the `solid`
      exemplar has the evaluated solid's triangle count.
- [ ] **Step 2–5:** FAIL with `pnpm --filter @dxos/react-ui-scene exec vitest run --project=node src/three/io`, implement,
      PASS, commit `react-ui-scene: mesh import and STL export`.

### Task 18: Retire plugin-spacetime

**Files:**

- Delete: `packages/plugins/plugin-spacetime/`
- Modify: `packages/apps/composer-app/src/plugin-defs.tsx`, `packages/apps/composer-app/package.json`, any other
  dependents (`grep -rn "plugin-spacetime" --include=package.json packages tools`), `pnpm-lock.yaml`

- [ ] **Step 1:** List dependents; confirm parity: select, move, extrude, join, subtract, GLB/OBJ import and STL export
      each have a Task 12–17 test.
- [ ] **Step 2:** Remove the plugin and its references; `pnpm install` (background) and revert `pnpm-workspace.yaml`
      if it changes.
- [ ] **Step 3:** `moon run composer-app:build` (background) and `pnpm knip` → no new findings.
- [ ] **Step 4:** Changeset naming the removal. Commit `plugin-spacetime: retire in favour of the 3D canvas`.

## Phase D — Assistant

### Task 19: ReadScene and EditScene operations

**Files:**

- Modify: `packages/plugins/plugin-canvas/src/types/CanvasOperation.ts`, `operations/CanvasOperationHandlerSet.ts`
- Create: `packages/plugins/plugin-canvas/src/operations/scene.ts`
- Test: `packages/plugins/plugin-canvas/src/operations/scene.test.ts`

**Interfaces:**

- Consumes: `Dsl.readScenes`/`Dsl.printScenes`, `fromEcho`/`toEcho`, Task 13 `applySceneIntent`.
- Produces:
  - `ReadScene` — key `org.dxos.operation.canvas.readScene`; input `{ drawing: Ref<Drawing.Drawing> }` (resolved through its `Canvas`); output `{ dx: string }`.
  - `EditScene` — key `org.dxos.operation.canvas.editScene`; input `{ drawing: Ref<Drawing.Drawing>; dx: string }`;
    output `{ problems: { part: 'scene' | 'layout' | 'model'; id: string; element?: string; message: string }[] }`.
    Applies the difference between the stored and the given document as one `batch` intent per layout, so undo reverts
    one edit.

- [ ] **Step 1: Failing tests** — `ReadScene` on each exemplar drawing returns text that `readScenes` reads back equal;
      `EditScene` moving one element changes only that element; text with a problem writes nothing and returns it
      (Review Focus 5); a removed layout unlinks the `parts` Ref of every object that names it.
- [ ] **Step 2: Run, expect FAIL** — `pnpm --filter @dxos/plugin-canvas exec vitest run --project=node src/operations/scene.test.ts`.
- [ ] **Step 3–5:** implement, PASS, commit `plugin-canvas: read and edit scenes as DSL`.

### Task 20: Scene skill

**Files:**

- Create: `packages/plugins/plugin-canvas/src/skills/SceneSkill.ts`
- Modify: `packages/plugins/plugin-canvas/src/skills/index.ts`, `capabilities/skill-definition.ts`
- Test: `packages/plugins/plugin-canvas/src/skills/SceneSkill.test.ts`

**Interfaces:**

- Produces: a skill whose instructions (via `trim`) describe the `scene`, `layout` and `model` blocks and their
  `camera`, `element` and `object` statements, kinds per dimension, bindings, groups, composite objects and solids,
  with one 2D and one 3D example from `EXEMPLARS`; tools
  `ReadScene`, `EditScene`.

- [ ] **Step 1: Failing test** — the skill lists exactly the two operations, and every `.dx` example in its
      instructions reads with no problems.
- [ ] **Step 2–5:** FAIL with `pnpm --filter @dxos/plugin-canvas exec vitest run --project=node src/skills/SceneSkill.test.ts`,
      implement, PASS, commit `plugin-canvas: scene skill`.

## Self-review

- **Spec coverage:** §1 model switch → Tasks 1–2, 6–9; decision 10 / D-26 (drawing model) → 3–5; §2 intents → 10, 15;
  §3 viewports/picking → 11, 12; §4 panels → 14 (Properties over the schema; Library panel deferred — no stage 3
  decision requires it, recorded as a follow-up); §5 migration → 4; §6 order → phases A–D; decision 11 → 18; decision 12
  → 6–8 before 9; decisions 5–9 → 4, 14, 19–20, 12, existing orbit.
- **Type consistency:** `SceneIntent`, `applyIntent`, `applySceneIntent`, `canvasScene`, `createCanvas`,
  `bindSceneStore`, `variantFor`, `migrateSceneDrawing`, `Tool3D` are named the same in every task; 3D elements use
  `center` (D-24).
- **Proportion:** signatures and test assertions only; no bodies except the test sketches.
