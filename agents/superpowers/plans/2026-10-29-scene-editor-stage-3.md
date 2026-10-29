# Scene Editor (Stage 3) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** One editor, grown inside plugin-canvas, edits 2D and 3D scenes stored as `Scene2D`/`Scene3D`, so today's
canvas becomes its 2D case, plugin-spacetime is retired, and the assistant edits scenes through the `.dx` DSL.

**Architecture:** react-ui-canvas keeps its `View`/`ViewStore`/`VersionedSource` engine; a lossless adapter backs its
`ViewStore` with `Scene2D` ECHO objects, so the 2D mechanism depends only on `Scene` (decision 5). 3D gets a shared
`SceneIntent` reducer in `@dxos/scene`, a picking contract on `SceneRenderer3D`, Babylon `GizmoManager` handles and a
`VersionedSource` over `Scene3D` for undo. Every drawing is a plugin-illustrator `Drawing` whose `content` Ref names
one plugin-owned type (`Tldraw.Content`, `Excalidraw.Content`, plugin-canvas `Canvas`); `Canvas` holds the metadata and
named style classes, and its `content` Ref names a `Scene2D` or `Scene3D`, whose type picks the viewport (decision 10).

**Tech Stack:** TypeScript, Effect Schema, ECHO (`@dxos/echo`), effect-atom, React, Babylon.js, manifold-3d, vitest.

**Spec:** `agents/superpowers/specs/2026-10-28-scene-editor-design.md` (decisions 1–12; no open questions); model spec
`packages/common/scene/SPEC.mdl` (D-1…D-22); stage 2 design
`agents/superpowers/specs/2026-10-28-scene-model-design.md`.

## Global Constraints

- The editor grows inside plugin-canvas; no new editor plugin (decision 1).
- The plugin owns a canvas object for its metadata; editing, rendering and animation depend only on `Scene` (decision 5).
- Every drawing is a `Drawing`; `Drawing.content` is a Ref to `Tldraw.Content`, `Excalidraw.Content` or `Canvas`, each
  owned by its plugin. `Canvas` holds the metadata and named style classes; `Canvas.content` is a Ref to a `Scene2D` or
  `Scene3D`, and that type picks the viewport (decisions 6, 10).
- plugin-canvas switches to `Scene2D` only when every react-ui-canvas mode runs on it: free (freehand), lattice,
  constrained and scored — and dynamic, which is also a projection mode (decision 12).
- plugin-spacetime is deleted within stage 3 once each of its tools has a test in the new editor (decision 11).
- 3D handles are Babylon's `GizmoManager` (decision 8). The 3D viewer orbits; in an animator stage the animation drives
  the camera (decision 9).
- Every existing drawing migrates to the content model: tldraw and excalidraw content into their own types unchanged,
  scene canvases (`dxos.org/scene/2`) into a `Canvas` plus `Scene2D` objects. plugin-spacetime data does not migrate.
- Records are the source of truth; the DSL is their lossless text form. Positions round to 0.001.
- New packages: none. Workspace deps use `workspace:*`; never let `pnpm add` bump the catalog — revert
  `pnpm-workspace.yaml` with `git checkout pnpm-workspace.yaml` if it changes.
- No casts to silence types (`as any`, `!`); `Obj.instanceOf` for ECHO checks; relative imports carry `.ts`.
- Every spec change adds a `decision` to `packages/common/scene/SPEC.mdl` in the same commit.
- Run one test file with `pnpm --filter <pkg> exec vitest run --project=node <file>`; format with `npx oxfmt <files>`
  before every commit; commit by pathspec.
- Never touch `tools/autocue/showcase/echo3d/*`.

## Review Focus

1. A drawing opened by an old client after a new client migrated it: the old client finds no `canvas` Ref and must show
   "update to open" rather than create an empty canvas over the migrated content.
2. Linked drawings (portal frames) whose target is not migrated yet: the scene store must open them read-through, not
   drop them.
3. Undo across an ECHO-backed `Scene3D` after a remote edit to the same element: `patchSource` must skip, not clobber.
4. A gizmo drag on an element inside a child scene: the intent must target the child scene, not the root.
5. `EditScene` given DSL text with problems: no partial write; problems return to the caller.

---

## Phase A — Model switch (2D on Scene2D)

### Task 1: Lossless View ⇄ Scene2D mapping

**Files:**

- Modify: `packages/ui/react-ui-scene/src/canvas/adapter.ts`
- Test: `packages/ui/react-ui-scene/src/canvas/adapter.test.ts`

**Interfaces:**

- Consumes: `toCanvasViews(doc: Scene.SceneDocument)` (exists), react-ui-canvas `View`, `Node`, `Link`, `Layer`.
- Produces:
  - `toCanvasView(scene: Scene.SceneRecord2D): View`
  - `fromCanvasView(view: View, camera?: Scene.Camera2D): Scene.SceneRecord2D`
  - Node fields with no `Element2D` field are kept under `element.props.canvas`; View-level fields (`layers`, `kind`,
    `anonymous`) under the scene's new `props.canvas` (Step 3).

- [ ] **Step 1: Write the failing tests**

```ts
test('round-trips every node type and link shape in the canvas samples', () => {
  for (const view of sampleViews()) {
    expect(toCanvasView(fromCanvasView(view))).toEqual(withLegacyView(view));
  }
});
test('keeps a node field Element2D has no slot for under props.canvas', () => {
  const scene = fromCanvasView(
    viewWith({
      type: 'rect',
      id: 'a',
      center: { x: 0, y: 0 },
      size: { width: 64, height: 64 },
      text: { align: 'left' },
    }),
  );
  expect(scene.elements.a.props?.canvas).toMatchObject({ text: { align: 'left' } });
});
test('maps z to order and a link endpoint to a binding', () => {
  /* order === node.z; from.element === source.node */
});
```

`sampleViews()` reads the Views of `@dxos/react-ui-canvas/testing` sample scenes (every registered node type, every
link `type`).

- [ ] **Step 2: Run, expect FAIL** — `pnpm --filter @dxos/react-ui-scene exec vitest run --project=node src/canvas/adapter.test.ts` → `fromCanvasView is not a function`.
- [ ] **Step 3: Implement.** Layers and `kind`/`anonymous` (View-level fields) go in a reserved scene-level record:
      add `props?: Record<string, unknown>` to `sceneFields` in `@dxos/scene` (`Scene.ts`), with SPEC decision
      "Scenes carry renderer-specific props, as elements do." `toCanvasViews` becomes `doc.scenes.map(toCanvasView)`.
- [ ] **Step 4: Run, expect PASS** (same command), plus `pnpm --filter @dxos/scene exec vitest run --project=node`.
- [ ] **Step 5: Commit** `react-ui-scene: lossless View and Scene2D mapping`.

### Task 2: A ViewStore backed by Scene2D objects

**Files:**

- Create: `packages/plugins/plugin-canvas/src/model/scene-store.ts`
- Test: `packages/plugins/plugin-canvas/src/model/scene-store.test.ts`

**Interfaces:**

- Consumes: Task 1 `toCanvasView`/`fromCanvasView`; `Scene.Scene2D`; react-ui-canvas `ViewStore`, `VersionedSource`.
- Produces: `bindSceneStore(registry: Registry.AtomRegistry, root: Scene.Scene2D): BoundSceneStore` where
  `BoundSceneStore = { store: ViewStore; root: ViewId; dispose: () => void }`. View ids are scene `key`s; child scenes
  are reached through elements' `child` Refs and loaded on demand.

- [ ] **Step 1: Failing tests**

```ts
test('a node moved through the store is written to the Scene2D element', ...);   // elements.a.center updated
test('an ECHO edit to the Scene2D reaches the View atom', ...);                    // registry.get(store.view(root)).nodes.a
test('a child scene reached by Ref opens as its own View', ...);                  // store.view('b-detail') defined
test('versions.read at earlier heads returns the earlier View', ...);             // undo reads the past
test('an unchanged element is not rewritten when another moves', ...);           // per-element writes, so ECHO merges by element
```

Use `EchoTestBuilder` with `Scene.Scene2D` registered, as `use-scene-document.test.ts` does.

- [ ] **Step 2: Run, expect FAIL** — `pnpm --filter @dxos/plugin-canvas exec vitest run --project=node src/model/scene-store.test.ts`.
- [ ] **Step 3: Implement.** Writes diff the new View against the old (`diffPaths`) and write only changed elements via
      `Obj.change`; `versions` maps `[viewId, 'nodes', id, …]` paths onto `elements.<id>` and reads past values with
      the object's heads, as `bindCanvasStore` does for content records.
- [ ] **Step 4: Run, expect PASS.**
- [ ] **Step 5: Commit** `plugin-canvas: ViewStore over Scene2D objects`.

### Task 3: Drawing content model

**Files:**

- Modify: `packages/plugins/plugin-illustrator/src/types/Drawing.ts`, `IllustratorCapabilities.ts`
- Modify: `packages/plugins/plugin-tldraw/src/types/Tldraw.ts`, `capabilities/drawing-variant.ts`
- Modify: `packages/plugins/plugin-excalidraw/src/types/Excalidraw.ts`, `capabilities/drawing-variant.ts`
- Test: `packages/plugins/plugin-illustrator/src/types/Drawing.test.ts` (create)

**Interfaces:**

- Produces:
  - `Drawing.Drawing` gains `content: Schema.optional(Ref.Ref(Obj.Unknown))`; `canvas` becomes optional and is read only
    by the migration (Task 4). `Drawing.make({ name, content }: { name?: string; content: Obj.Any }): Drawing`.
  - The old inner type is renamed `Drawing.LegacyCanvas` (same DXN `org.dxos.type.canvas@0.1.0`, so stored objects still
    load); `makeCanvas`/`isCanvas` are removed and every call site moves to the variant's own type.
  - `DrawingVariant` replaces `id`-matching on `Canvas.schema` with `contentType: Type.AnyObj` (required),
    `createContent: (input?) => Effect.Effect<Obj.Any, Error, Database.Service>` and
    `migrate: (legacy: Drawing.LegacyCanvas) => Effect.Effect<Obj.Any, Error, Database.Service>`; `legacySchema` names
    the `LegacyCanvas.schema` the variant migrates from. `DrawingVariantSurfaceProps.canvas` becomes `content: Obj.Any`.
  - `resolveContent(drawing: Drawing.Drawing): Effect.Effect<Obj.Any | undefined>` and
    `variantFor(content: Obj.Any, variants: readonly DrawingVariant[]): DrawingVariant | undefined` (by typename).
  - `Tldraw.Content` — DXN `org.dxos.type.tldraw.content@0.1.0`, `{ content: Record<string, any>; styles?: Record<string, any> }`.
  - `Excalidraw.Content` — DXN `org.dxos.type.excalidraw.content@0.1.0`, same fields.

- [ ] **Step 1: Failing tests** — `Drawing.make` with a `Tldraw.Content` resolves it through `resolveContent`;
      `variantFor` picks the tldraw variant by typename; a query for `Drawing.Drawing` returns tldraw, excalidraw and
      canvas drawings together (decision 10).
- [ ] **Step 2: Run, expect FAIL** — `pnpm --filter @dxos/plugin-illustrator exec vitest run --project=node src/types/Drawing.test.ts`.
- [ ] **Step 3: Implement.** Update each tldraw/excalidraw store adapter (`hooks/useStoreAdapter.ts`) and container to
      take its own content type. SPEC decision (agent, for user): "A drawing variant owns its content type and migrates
      from the legacy canvas." Fills in D-20.
- [ ] **Step 4: Run, expect PASS**, plus `pnpm --filter @dxos/plugin-tldraw exec vitest run --project=node` and
      `pnpm --filter @dxos/plugin-excalidraw exec vitest run --project=node`; typecheck all three packages.
- [ ] **Step 5: Commit** `plugin-illustrator: drawings hold a plugin-owned content type`.

### Task 4: Migrate drawings to the content model

**Files:**

- Create: `packages/plugins/plugin-illustrator/src/model/migrate-drawing.ts`
- Test: `packages/plugins/plugin-illustrator/src/model/migrate-drawing.test.ts`
- Modify: the tldraw and excalidraw variants (`migrate`)

**Interfaces:**

- Consumes: Task 3 variants.
- Produces: `migrateDrawing(drawing: Drawing.Drawing, variants: readonly DrawingVariant[]): Effect.Effect<boolean, Error, Database.Service>`
  — for a drawing with a `canvas` Ref and no `content`, picks the variant by `LegacyCanvas.schema`, creates its content
  with `variant.migrate`, sets `content` and clears `canvas` in one change; returns whether it changed anything.

- [ ] **Step 1: Failing tests**

```ts
test('a tldraw drawing keeps every record and style after migration', ...);
test('an excalidraw drawing keeps every record and style after migration', ...);
test('running it twice changes nothing the second time', ...);       // second call returns false
test('a drawing whose schema no variant claims is left as it is', ...);
```

- [ ] **Step 2: Run, expect FAIL** — `pnpm --filter @dxos/plugin-illustrator exec vitest run --project=node src/model/migrate-drawing.test.ts`.
- [ ] **Step 3: Implement.** ECHO's `Migration.define` maps one type to one type and `Migration.defineContent` cannot
      create objects, so this runs when a drawing is opened for writing (the article surface) and from a space-level
      `MigrateDrawings` operation; a read-only viewer reads the legacy canvas (Review Focus 1).
- [ ] **Step 4: Run, expect PASS.**
- [ ] **Step 5: Commit** `plugin-illustrator: migrate drawings to their content types`.

### Task 5: The plugin-canvas Canvas type and its migration

**Files:**

- Modify: `packages/plugins/plugin-canvas/src/types/Canvas.ts`, `model/store.ts` (`createCanvas`),
  `capabilities/drawing-variant.ts`
- Create: `packages/plugins/plugin-canvas/src/model/migrate-scenes.ts`
- Test: `packages/plugins/plugin-canvas/src/model/migrate-scenes.test.ts`, `src/model/content.test.ts`

**Interfaces:**

- Consumes: Task 1 `fromCanvasView`; Task 3 variant contract; the v2 reader in `store.ts`.
- Produces:
  - `Canvas.Canvas` — DXN `org.dxos.type.canvas.canvas@0.1.0`, `{ settings: CanvasSettings; styles?: Record<string, StyleClass>; content: Ref.Ref(Obj.Unknown) }`,
    where `CanvasSettings` is today's `CanvasRecord` minus `kind` and `root` (lattice, grid, readonly, theme, styleSet,
    background, backgroundGrid, diagramShapes).
  - `createCanvas(settings?: Partial<CanvasSettings> & { dimension?: Scene.Dimension }): { canvas: Canvas.Canvas; scene: Scene.Scene2D | Scene.Scene3D }`
  - `canvasScene(canvas: Canvas.Canvas): Scene.Scene2D | Scene.Scene3D | undefined`
  - The variant's `migrate(legacy)` for `dxos.org/scene/2`: one `Scene2D` per scene record (child scenes linked by
    `child` Ref), the canvas record's settings and the legacy `styles` onto the new `Canvas`.

- [ ] **Step 1: Failing tests**

```ts
test('createCanvas() makes a Canvas whose content is a Scene2D; dimension 3d makes a Scene3D', ...);
test('every sample canvas reads the same Views before and after migration', ...); // bindCanvasStore(legacy) vs bindSceneStore
test('a portal frame becomes an element with a child Ref', ...);
test('named style classes and settings move onto the Canvas', ...);
test('a lattice canvas keeps lattice: true in its settings', ...);
```

Samples: `packages/plugins/plugin-canvas/src/samples/*`.

- [ ] **Step 2: Run, expect FAIL** — `pnpm --filter @dxos/plugin-canvas exec vitest run --project=node src/model/migrate-scenes.test.ts`.
- [ ] **Step 3: Implement.** SPEC decision (agent, for user): "plugin-canvas's `Canvas` keeps settings and style classes;
      elements live in its scene." Fills in D-20. The existing `dxos.org/scene/1 → 2` content migration stays, so a v1
      canvas reaches v2 before this one runs.
- [ ] **Step 4: Run, expect PASS.**
- [ ] **Step 5: Commit** `plugin-canvas: Canvas type over a Scene, migrated from scene canvases`.

### Task 6: Convert drawings through the content model

**Files:**

- Modify: `packages/plugins/plugin-illustrator/src/operations/convert.ts`, `types/IllustratorCapabilities.ts` (`DrawingConverter`)
- Test: `packages/plugins/plugin-illustrator/src/operations/convert.test.ts`

**Interfaces:**

- Consumes: Tasks 3–5.
- Produces: `DrawingConverter.convert(source: Obj.Any, variants) => Effect.Effect<{ content: Obj.Any; upserted: readonly string[] }>`;
  `Convert` creates the target with `variant.createContent` and, when the target is the canvas variant, replays the
  scene into its `Scene2D` (the pivot) rather than into content records.

- [ ] **Step 1: Failing tests** — the existing convert tests re-run on the content model; tldraw → canvas yields a
      `Canvas` whose `Scene2D` holds the converted shapes; canvas → excalidraw reads them back out.
- [ ] **Step 2: Run, expect FAIL** — `pnpm --filter @dxos/plugin-illustrator exec vitest run --project=node src/operations/convert.test.ts`.
- [ ] **Step 3–5:** implement, PASS, commit `plugin-illustrator: convert drawings through their content types`.

### Task 7: Lattice mode on Scene2D

**Files:**

- Modify: `packages/plugins/plugin-canvas/src/containers/CanvasArticle/CanvasArticle.tsx` (projection choice reads
  `canvas.settings.lattice`)
- Test: `packages/plugins/plugin-canvas/src/model/scene-store.test.ts`, `packages/ui/react-ui-canvas/src/engine/projections/lattice.test.ts`

**Interfaces:**

- Consumes: Task 2 `bindSceneStore`, Task 5 `Canvas.settings`; react-ui-canvas `createLatticeProjection`.
- Produces: no new API — the lattice projection runs over the `ViewStore` that `bindSceneStore` returns.

- [ ] **Step 1: Failing tests** — the lattice projection tests re-run with a store from `bindSceneStore` over each lattice
      sample: a move lands on whole cells, a resize spans whole cells, links route along gutters, and the result is
      written to `Scene2D` elements.
- [ ] **Step 2: Run, expect FAIL** — `pnpm --filter @dxos/plugin-canvas exec vitest run --project=node src/model/scene-store.test.ts`.
- [ ] **Step 3–5:** implement, PASS, commit `plugin-canvas: lattice canvases on Scene2D`.

### Task 8: Constrained and dynamic modes on Scene2D

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

### Task 9: Scored mode on Scene2D

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

### Task 10: plugin-canvas edits through the scene store

**Files:**

- Modify: `packages/plugins/plugin-canvas/src/containers/CanvasArticle/use-canvas-scene.ts`, `CanvasArticle.tsx`,
  `CanvasCard/CanvasCard.tsx`, `CanvasStage/CanvasStage.tsx`, `CanvasProperties/*`
- Modify: `packages/plugins/plugin-canvas/src/operations/apply.ts`, `patch-store.ts`, `capabilities/animator-stage.ts`
- Test: `packages/plugins/plugin-canvas/src/containers/CanvasArticle/use-canvas-scene.test.ts` (create),
  `packages/plugins/plugin-canvas/src/operations/operations.test.ts`

**Interfaces:**

- Consumes: Tasks 2–9.
- Produces: `useCanvasScene(canvas: Canvas.Canvas)` returns the same shape as today, backed by `bindSceneStore` in every
  mode; `bindCanvasStore` is kept only as the legacy reader Task 5's migration uses.

- [ ] **Step 1: Failing tests** — opening a legacy sample drawing migrates it and edits its `Scene2D`; the `Apply` and
      `Patch` operations write `Scene2D` elements; StyleClassList edits `Canvas.styles`.
- [ ] **Step 2: Run, expect FAIL** — `pnpm --filter @dxos/plugin-canvas exec vitest run --project=node src/operations/operations.test.ts`.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run the whole package**: `pnpm --filter @dxos/plugin-canvas exec vitest run --project=node` → all pass;
      then `moon run react-ui-canvas:test-browser` (playwright specs) → unchanged.
- [ ] **Step 5: Verify in storybook** — `CanvasArticle` stories in each mode render and edit; link each story.
- [ ] **Step 6: Commit** `plugin-canvas: edit canvases as Scene2D`.

## Phase B — 3D viewport and arranging

### Task 11: Shared scene intents

**Files:**

- Create: `packages/common/scene/src/intent.ts`
- Test: `packages/common/scene/src/intent.test.ts`
- Modify: `packages/common/scene/src/index.ts`, `SPEC.mdl`

**Interfaces:**

- Produces:
  - `SceneIntent` (Schema union, `kind` tag): `create { element }`, `delete { ids }`, `update { id, path: string[], value }`,
    `reorder { id, order }`, `group { id, members, layout? }`, `ungroup { id }`, `bind { link: Element }`,
    `move { ids, delta: Vec2 | Vec3 }`, `rotate { ids, delta: number | Vec3 }`, `scale { ids, factor: Size2 | Vec3 }`,
    `batch { intents }`.
  - `applyIntent<S extends SceneRecord>(scene: S, intent: SceneIntent): S` — pure; geometric intents dispatch on
    `scene.dim`.
  - `isSceneIntent: (value: unknown) => value is SceneIntent`.

- [ ] **Step 1: Failing tests**

```ts
test('move adds a Vec3 delta to each 3D position and rounds to 0.001', ...);
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

### Task 12: Picking

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

### Task 13: Scene3DEditor with GizmoManager

**Files:**

- Create: `packages/ui/react-ui-scene/src/components/Scene3DEditor/{Scene3DEditor.tsx,gizmo.ts,gizmo.test.ts,Scene3DEditor.stories.tsx,index.ts}`

**Interfaces:**

- Consumes: Task 11 `SceneIntent`, Task 12 `pick`; `Scene3DView`'s renderer setup (extract a shared `useRenderer` hook
  from `Scene3DView.tsx` rather than duplicate it).
- Produces:
  - `Scene3DEditorProps = { document: Scene.SceneDocument; selection: readonly string[]; tool: Tool3D; onSelect: (ids: string[]) => void; onIntent: (intent: Scene.SceneIntent) => void }`
  - `Tool3D = 'select' | 'move' | 'rotate' | 'scale' | 'link' | { create: string }`
  - `gizmoIntent(mode: 'move' | 'rotate' | 'scale', id: string, before: Scene.Element3D, after: { position: Vec3; rotation: Vec3; scale: Vec3 }): Scene.SceneIntent | undefined`
  - `SceneRenderer3D.attachGizmo(key: string | undefined, mode, onEnd: (after) => void): void`

- [ ] **Step 1: Failing tests** (`gizmo.test.ts`): a move gizmo drag yields a `move` with the position delta; rotate
      yields degrees; scale yields per-axis factors; an unchanged transform yields undefined; an element in a child
      scene yields an intent whose ids name the child element (Review Focus 4: `onIntent` receives `{ scene, intent }`
      — make the prop `onIntent: (scene: string, intent: SceneIntent) => void`).
- [ ] **Step 2: Run, expect FAIL** — `pnpm --filter @dxos/react-ui-scene exec vitest run --project=node src/components/Scene3DEditor/gizmo.test.ts`.
- [ ] **Step 3: Implement.** Click selects (shift toggles); empty click clears; `{ create: kind }` places a unit element
      at `groundPoint`; `link` binds the first and second clicked elements. Orbit stays on the middle/right button
      while a tool other than `select` owns the left.
- [ ] **Step 4: Run, expect PASS.** Story with every exemplar; verify in the browser pane and link the story.
- [ ] **Step 5: Commit** `react-ui-scene: 3D editor viewport with gizmos`.

### Task 14: Undo over Scene3D

**Files:**

- Create: `packages/plugins/plugin-canvas/src/model/scene3d-source.ts`
- Test: `packages/plugins/plugin-canvas/src/model/scene3d-source.test.ts`

**Interfaces:**

- Produces: `scene3dSource(scene: Scene.Scene3D): VersionedSource` (paths `['elements', id, …]`) and
  `applySceneIntent(scene: Scene.Scene2D | Scene.Scene3D, intent: Scene.SceneIntent): void` — applies via `applyIntent`
  and writes only changed elements in one `Obj.change`.

- [ ] **Step 1: Failing tests** — apply, undo (react-ui-canvas `recordChanges` + `patchSource`) restores elements, redo
      reapplies; a remote edit to the same element after the change makes undo skip it (`skipped: 1`).
- [ ] **Step 2: Run, expect FAIL** — `pnpm --filter @dxos/plugin-canvas exec vitest run --project=node src/model/scene3d-source.test.ts`.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run, expect PASS.**
- [ ] **Step 5: Commit** `plugin-canvas: undo for 3D scenes`.

### Task 15: The 3D canvas article

**Files:**

- Create: `packages/plugins/plugin-canvas/src/containers/Scene3DArticle/{Scene3DArticle.tsx,Scene3DArticle.stories.tsx,index.ts}`
- Modify: `packages/plugins/plugin-canvas/src/capabilities/react-surface.tsx`, create-object flow, `translations.ts`
- Test: `packages/plugins/plugin-canvas/src/plugin.test.ts`

**Interfaces:**

- Consumes: Tasks 5, 13, 14.
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

### Task 16: Solid intents

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

### Task 17: Extrude, join and subtract tools

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

### Task 18: Mesh import and STL export

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

### Task 19: Retire plugin-spacetime

**Files:**

- Delete: `packages/plugins/plugin-spacetime/`
- Modify: `packages/apps/composer-app/src/plugin-defs.tsx`, `packages/apps/composer-app/package.json`, any other
  dependents (`grep -rn "plugin-spacetime" --include=package.json packages tools`), `pnpm-lock.yaml`

- [ ] **Step 1:** List dependents; confirm parity: select, move, extrude, join, subtract, GLB/OBJ import and STL export
      each have a Task 13–18 test.
- [ ] **Step 2:** Remove the plugin and its references; `pnpm install` (background) and revert `pnpm-workspace.yaml`
      if it changes.
- [ ] **Step 3:** `moon run composer-app:build` (background) and `pnpm knip` → no new findings.
- [ ] **Step 4:** Changeset naming the removal. Commit `plugin-spacetime: retire in favour of the 3D canvas`.

## Phase D — Assistant

### Task 20: ReadScene and EditScene operations

**Files:**

- Modify: `packages/plugins/plugin-canvas/src/types/CanvasOperation.ts`, `operations/CanvasOperationHandlerSet.ts`
- Create: `packages/plugins/plugin-canvas/src/operations/scene.ts`
- Test: `packages/plugins/plugin-canvas/src/operations/scene.test.ts`

**Interfaces:**

- Consumes: `Dsl.readScenes`/`Dsl.printScenes`, `fromEcho`/`toEcho`, Task 14 `applySceneIntent`.
- Produces:
  - `ReadScene` — key `org.dxos.operation.canvas.readScene`; input `{ drawing: Ref<Drawing.Drawing> }` (resolved through its `Canvas`); output `{ dx: string }`.
  - `EditScene` — key `org.dxos.operation.canvas.editScene`; input `{ drawing: Ref<Drawing.Drawing>; dx: string }`;
    output `{ problems: { scene: string; element?: string; message: string }[] }`. Applies the difference between the
    stored and the given document as one `batch` intent per scene, so undo reverts one edit.

- [ ] **Step 1: Failing tests** — `ReadScene` on each exemplar drawing returns text that `readScenes` reads back equal;
      `EditScene` moving one element changes only that element; text with a problem writes nothing and returns it
      (Review Focus 5); a removed scene unlinks its child Ref.
- [ ] **Step 2: Run, expect FAIL** — `pnpm --filter @dxos/plugin-canvas exec vitest run --project=node src/operations/scene.test.ts`.
- [ ] **Step 3–5:** implement, PASS, commit `plugin-canvas: read and edit scenes as DSL`.

### Task 21: Scene skill

**Files:**

- Create: `packages/plugins/plugin-canvas/src/skills/SceneSkill.ts`
- Modify: `packages/plugins/plugin-canvas/src/skills/index.ts`, `capabilities/skill-definition.ts`
- Test: `packages/plugins/plugin-canvas/src/skills/SceneSkill.test.ts`

**Interfaces:**

- Produces: a skill whose instructions (via `trim`) describe `scene`, `camera` and `element` statements, kinds per
  dimension, bindings, groups, child scenes and solids, with one 2D and one 3D example from `EXEMPLARS`; tools
  `ReadScene`, `EditScene`.

- [ ] **Step 1: Failing test** — the skill lists exactly the two operations, and every `.dx` example in its
      instructions reads with no problems.
- [ ] **Step 2–5:** FAIL with `pnpm --filter @dxos/plugin-canvas exec vitest run --project=node src/skills/SceneSkill.test.ts`,
      implement, PASS, commit `plugin-canvas: scene skill`.

## Self-review

- **Spec coverage:** §1 model switch → Tasks 1–2, 7–10; decision 10 (drawing model) → 3–6; §2 intents → 11, 16; §3
  viewports/picking → 12, 13; §4 panels → 15 (Properties over the schema; Library panel deferred — no stage 3 decision
  requires it, recorded as a follow-up); §5 migration → 4, 5; §6 order → phases A–D; decision 11 → 19; decision 12 →
  7–9 before 10; decisions 5–9 → 5, 15, 20–21, 13, existing orbit.
- **Type consistency:** `SceneIntent`, `applyIntent`, `applySceneIntent`, `canvasScene`, `createCanvas`,
  `bindSceneStore`, `resolveContent`, `variantFor`, `migrateDrawing`, `Tool3D` are named the same in every task.
- **Proportion:** signatures and test assertions only; no bodies except the test sketches.
