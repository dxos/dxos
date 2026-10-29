# Scene Editor (Stage 3) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** One editor, grown inside plugin-canvas, edits 2D and 3D scenes stored as `Scene2D`/`Scene3D`, so today's
canvas becomes its 2D case, plugin-spacetime is retired, and the assistant edits scenes through the `.dx` DSL.

**Architecture:** react-ui-canvas keeps its `View`/`ViewStore`/`VersionedSource` engine; a lossless adapter backs its
`ViewStore` with `Scene2D` ECHO objects, so the 2D mechanism depends only on `Scene` (decision 5). 3D gets a shared
`SceneIntent` reducer in `@dxos/scene`, a picking contract on `SceneRenderer3D`, Babylon `GizmoManager` handles and a
`VersionedSource` over `Scene3D` for undo. The canvas object keeps its metadata and holds a Ref to the root scene; the
editor picks the viewport from the root's type (decision 6).

**Tech Stack:** TypeScript, Effect Schema, ECHO (`@dxos/echo`), effect-atom, React, Babylon.js, manifold-3d, vitest.

**Spec:** `agents/superpowers/specs/2026-10-28-scene-editor-design.md` (decisions 1–9, three open questions on
provisional defaults); model spec `packages/common/scene/SPEC.mdl` (D-1…D-19); stage 2 design
`agents/superpowers/specs/2026-10-28-scene-model-design.md`.

## Global Constraints

- The editor grows inside plugin-canvas; no new editor plugin (decision 1).
- The plugin owns a canvas object for its metadata; editing, rendering and animation depend only on `Scene` (decision 5).
- One canvas object type for both dimensions; its root Ref points at a `Scene2D` or `Scene3D` (decision 6).
- 3D handles are Babylon's `GizmoManager` (decision 8). The 3D viewer orbits; in an animator stage the animation drives
  the camera (decision 9).
- Existing scene canvases (`dxos.org/scene/2`) migrate to Scene objects; plugin-spacetime data does not migrate.
- Records are the source of truth; the DSL is their lossless text form. Positions round to 0.001.
- New packages: none. Workspace deps use `workspace:*`; never let `pnpm add` bump the catalog — revert
  `pnpm-workspace.yaml` with `git checkout pnpm-workspace.yaml` if it changes.
- No casts to silence types (`as any`, `!`); `Obj.instanceOf` for ECHO checks; relative imports carry `.ts`.
- Every spec change adds a `decision` to `packages/common/scene/SPEC.mdl` in the same commit.
- Run one test file with `pnpm --filter <pkg> exec vitest run --project=node <file>`; format with `npx oxfmt <files>`
  before every commit; commit by pathspec.
- Never touch `tools/autocue/showcase/echo3d/*`.

## Provisional tasks

The design's three open questions are planned on their marked defaults. The tasks marked **[provisional Qn]** change if
the user answers otherwise:

- **Q1 (canvas owner = plugin-canvas):** Tasks 3, 4. The generic `Drawing.Canvas` container stays in plugin-illustrator
  (tldraw and excalidraw share it); plugin-canvas owns the `dxos.org/scene/3` dialect, its metadata record and the
  migration. If the user wants plugin-illustrator to own it, the dialect code moves there and plugin-canvas contributes
  only the surface.
- **Q2 (delete spacetime at parity):** Task 14. Alternative: deprecate and hide.
- **Q3 (free canvas parity only):** Tasks 4, 5. Lattice canvases stay on the v2 record store until a later stage.

## Review Focus

1. A canvas edited by a v2 client and a v3 client concurrently: the v3 client must not overwrite records it has
   migrated away from (the migration runs once, keyed by `schema`, and a v2 writer sees a newer revision as read-only).
2. Linked drawings (portal frames) whose target is still v2: the scene store must open them read-through, not drop them.
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

### Task 3: The canvas object holds a Ref to its root scene **[provisional Q1]**

**Files:**

- Modify: `packages/plugins/plugin-illustrator/src/types/Drawing.ts` (optional `root` field)
- Modify: `packages/plugins/plugin-canvas/src/types/Canvas.ts` (`SCENE_REVISION = 3`)
- Modify: `packages/plugins/plugin-canvas/src/model/store.ts` (`createCanvas`)
- Test: `packages/plugins/plugin-canvas/src/model/content.test.ts`

**Interfaces:**

- Produces:
  - `Drawing.Canvas` gains `root: Schema.optional(Ref.Ref(Obj.Unknown))` — the root `Scene2D`/`Scene3D`.
  - `createCanvas(settings?: Partial<Omit<CanvasRecord, 'kind' | 'root'>> & { dimension?: Scene.Dimension }): { canvas: Drawing.Canvas; root: Scene.Scene2D | Scene.Scene3D }`
  - `rootScene(canvas: Drawing.Canvas): Scene.Scene2D | Scene.Scene3D | undefined`
  - Content at revision 3 holds only the `canvas` metadata record (`CanvasRecord` minus `root`).

- [ ] **Step 1: Failing tests** — `createCanvas()` returns a `Scene2D` root and schema `dxos.org/scene/3`;
      `createCanvas({ dimension: '3d' })` returns a `Scene3D`; `rootScene` resolves the Ref; a v3 canvas's content has
      exactly one record, `canvas`.
- [ ] **Step 2: Run, expect FAIL** — `pnpm --filter @dxos/plugin-canvas exec vitest run --project=node src/model/content.test.ts`.
- [ ] **Step 3: Implement.** SPEC decision (agent, for user): "A canvas at revision 3 keeps its metadata record and a Ref
      to its root scene; elements live in the scene." Fills in D-16 and D-17.
- [ ] **Step 4: Run, expect PASS**, plus `pnpm --filter @dxos/plugin-illustrator exec vitest run --project=node src/types`.
- [ ] **Step 5: Commit** `plugin-canvas: canvas revision 3 with a root scene Ref`.

### Task 4: Migrate v2 canvases to Scene2D objects **[provisional Q1, Q3]**

**Files:**

- Create: `packages/plugins/plugin-canvas/src/model/migrate-scenes.ts`
- Test: `packages/plugins/plugin-canvas/src/model/migrate-scenes.test.ts`

**Interfaces:**

- Consumes: Task 1 `fromCanvasView`; Task 3 `root`; the v2 reader in `store.ts`.
- Produces: `migrateToScenes(canvas: Drawing.Canvas, db: Database.Database): Effect.Effect<Scene.Scene2D | undefined>` —
  creates one `Scene2D` per scene record (child scenes linked by `child` Ref), sets `canvas.root`, drops scene/node/link
  records and sets schema `dxos.org/scene/3`, all in one change. Returns undefined, changing nothing, for a lattice
  canvas (`CanvasRecord.lattice === true`) under Q3's default.

- [ ] **Step 1: Failing tests**

```ts
test('every sample canvas reads the same Views before and after migration', ...); // bindCanvasStore(v2) vs bindSceneStore(v3)
test('a portal frame becomes an element with a child Ref', ...);
test('running it twice changes nothing the second time', ...);
test('a lattice canvas is left at revision 2', ...);
test('a canvas at a newer revision is not touched', ...);
```

Samples: `packages/plugins/plugin-canvas/src/samples/*`.

- [ ] **Step 2: Run, expect FAIL** — `pnpm --filter @dxos/plugin-canvas exec vitest run --project=node src/model/migrate-scenes.test.ts`.
- [ ] **Step 3: Implement.** Content migrations (`Migration.defineContent`) cannot create objects, so this runs when a
      v2 canvas is bound for writing; a read-only viewer keeps the v2 store. Register no content migration.
- [ ] **Step 4: Run, expect PASS.**
- [ ] **Step 5: Commit** `plugin-canvas: migrate scene canvases to Scene2D objects`.

### Task 5: plugin-canvas edits through the scene store **[provisional Q3]**

**Files:**

- Modify: `packages/plugins/plugin-canvas/src/containers/CanvasArticle/use-canvas-scene.ts`
- Modify: `packages/plugins/plugin-canvas/src/operations/apply.ts`, `patch-store.ts`
- Test: `packages/plugins/plugin-canvas/src/containers/CanvasArticle/use-canvas-scene.test.ts` (create),
  `packages/plugins/plugin-canvas/src/operations/operations.test.ts`

**Interfaces:**

- Consumes: Tasks 2–4.
- Produces: `useCanvasScene(canvas: Drawing.Canvas)` returns the same shape as today, backed by `bindSceneStore` for a
  v3 canvas (migrating a v2 one first) and by `bindCanvasStore` for a lattice canvas.

- [ ] **Step 1: Failing tests** — opening a v2 sample canvas leaves it at v3 with a Scene2D root; the `Apply` and
      `Patch` operations write Scene2D elements for a v3 canvas (existing operation tests re-run against both stores).
- [ ] **Step 2: Run, expect FAIL** — `pnpm --filter @dxos/plugin-canvas exec vitest run --project=node src/operations/operations.test.ts`.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run the whole package**: `pnpm --filter @dxos/plugin-canvas exec vitest run --project=node` → all pass;
      then `moon run react-ui-canvas:test-browser` (playwright specs) → unchanged.
- [ ] **Step 5: Verify in storybook** — `CanvasArticle` stories render and edit; link each story in the report.
- [ ] **Step 6: Commit** `plugin-canvas: edit canvases as Scene2D`.

## Phase B — 3D viewport and arranging

### Task 6: Shared scene intents

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

### Task 7: Picking

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

### Task 8: Scene3DEditor with GizmoManager

**Files:**

- Create: `packages/ui/react-ui-scene/src/components/Scene3DEditor/{Scene3DEditor.tsx,gizmo.ts,gizmo.test.ts,Scene3DEditor.stories.tsx,index.ts}`

**Interfaces:**

- Consumes: Task 6 `SceneIntent`, Task 7 `pick`; `Scene3DView`'s renderer setup (extract a shared `useRenderer` hook
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

### Task 9: Undo over Scene3D

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

### Task 10: The 3D canvas article

**Files:**

- Create: `packages/plugins/plugin-canvas/src/containers/Scene3DArticle/{Scene3DArticle.tsx,Scene3DArticle.stories.tsx,index.ts}`
- Modify: `packages/plugins/plugin-canvas/src/capabilities/react-surface.tsx`, create-object flow, `translations.ts`
- Test: `packages/plugins/plugin-canvas/src/plugin.test.ts`

**Interfaces:**

- Consumes: Tasks 3, 8, 9.
- Produces: the article surface picks `CanvasArticle` or `Scene3DArticle` from `rootScene(canvas)`'s type; a toolbar
  (`useMenuActions` + `Menu.Root`, one `Toolbar.Root`) with select, move/rotate/scale, create cube/sphere/cylinder/cone,
  link, group, ungroup, delete, undo, redo; a Properties panel as a `Form` over `Scene.Element3D`; "New 3D canvas" in
  the create flow (`createCanvas({ dimension: '3d' })`).

- [ ] **Step 1: Failing test** — the plugin's create operation with `dimension: '3d'` yields a canvas whose root is a
      `Scene3D`; the surface resolver returns the 3D article for it.
- [ ] **Step 2: Run, expect FAIL** — `pnpm --filter @dxos/plugin-canvas exec vitest run --project=node src/plugin.test.ts`.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run, expect PASS**; typecheck `npx tsc --noEmit -p tsconfig.json`; story verified and linked.
- [ ] **Step 5: Commit** `plugin-canvas: 3D canvas article`.

## Phase C — Solid tools and spacetime retirement

### Task 11: Solid intents

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

### Task 12: Extrude, join and subtract tools

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

### Task 13: Mesh import and STL export

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

### Task 14: Retire plugin-spacetime **[provisional Q2]**

**Files:**

- Delete: `packages/plugins/plugin-spacetime/`
- Modify: `packages/apps/composer-app/src/plugin-defs.tsx`, `packages/apps/composer-app/package.json`, any other
  dependents (`grep -rn "plugin-spacetime" --include=package.json packages tools`), `pnpm-lock.yaml`

- [ ] **Step 1:** List dependents; confirm parity: select, move, extrude, join, subtract, GLB/OBJ import and STL export
      each have a Task 8–13 test.
- [ ] **Step 2:** Remove the plugin and its references; `pnpm install` (background) and revert `pnpm-workspace.yaml`
      if it changes.
- [ ] **Step 3:** `moon run composer-app:build` (background) and `pnpm knip` → no new findings.
- [ ] **Step 4:** Changeset naming the removal. Commit `plugin-spacetime: retire in favour of the 3D canvas`.

## Phase D — Assistant

### Task 15: ReadScene and EditScene operations

**Files:**

- Modify: `packages/plugins/plugin-canvas/src/types/CanvasOperation.ts`, `operations/CanvasOperationHandlerSet.ts`
- Create: `packages/plugins/plugin-canvas/src/operations/scene.ts`
- Test: `packages/plugins/plugin-canvas/src/operations/scene.test.ts`

**Interfaces:**

- Consumes: `Dsl.readScenes`/`Dsl.printScenes`, `fromEcho`/`toEcho`, Task 9 `applySceneIntent`.
- Produces:
  - `ReadScene` — key `org.dxos.operation.canvas.readScene`; input `{ canvas: Ref<Drawing.Canvas> }`; output `{ dx: string }`.
  - `EditScene` — key `org.dxos.operation.canvas.editScene`; input `{ canvas: Ref<Drawing.Canvas>; dx: string }`;
    output `{ problems: { scene: string; element?: string; message: string }[] }`. Applies the difference between the
    stored and the given document as one `batch` intent per scene, so undo reverts one edit.

- [ ] **Step 1: Failing tests** — `ReadScene` on each exemplar canvas returns text that `readScenes` reads back equal;
      `EditScene` moving one element changes only that element; text with a problem writes nothing and returns it
      (Review Focus 5); a removed scene unlinks its child Ref.
- [ ] **Step 2: Run, expect FAIL** — `pnpm --filter @dxos/plugin-canvas exec vitest run --project=node src/operations/scene.test.ts`.
- [ ] **Step 3–5:** implement, PASS, commit `plugin-canvas: read and edit scenes as DSL`.

### Task 16: Scene skill

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

- **Spec coverage:** §1 model switch → Tasks 1–5; §2 intents → 6, 11; §3 viewports/picking → 7, 8; §4 panels → 10
  (Properties over the schema; Library panel deferred — design lists it, no stage 3 decision requires it, recorded as a
  follow-up); §5 migration → 4; §6 order → phases A–D; decisions 5–9 → 2–3, 3/10, 15–16, 8, existing orbit.
- **Type consistency:** `SceneIntent`, `applyIntent`, `applySceneIntent`, `rootScene`, `bindSceneStore`, `Tool3D` are
  named the same in every task that uses them.
- **Proportion:** signatures and test assertions only; no bodies except the test sketches.
