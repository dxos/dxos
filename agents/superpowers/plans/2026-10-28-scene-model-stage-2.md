# Scene model, stage 2 (exemplars) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the shared 2D/3D scene model and its `.dx` text form, and prove them with eight exemplar scenes that
render in 2D, in 3D and through a 3D projection of 2D, and play a simple animation in plugin-animator.

**Architecture:** `@dxos/scene` (new, `packages/common/scene`) holds the schemas, validation, layout and ECHO
conversion. `@dxos/diagram` gains `scene`/`camera`/`element` statements that parse to and print from the plain record
form. `@dxos/react-ui-scene` (new, `packages/ui/react-ui-scene`) holds the renderers: a 2D adapter onto react-ui-canvas,
a Babylon 3D renderer with Manifold solids, and the 2D-in-3D projection. `plugin-scene` (new,
`packages/plugins/plugin-scene`) registers the ECHO types and the two animator stages.

**Tech Stack:** TypeScript, Effect Schema, `@dxos/echo`, Lezer, React, react-ui-canvas, Babylon.js, manifold-3d,
`@dxos/animation`, plugin-animator, Storybook, vitest.

**Spec:** `agents/superpowers/specs/2026-10-28-scene-model-design.md` (approved 2026-10-28). Decisions are cited as D-n
from its numbered list.

## Global Constraints

- New packages set `"private": true`. In-repo deps use `workspace:*`; peer deps `workspace:^`; external deps from the
  catalog (`pnpm add --filter "<pkg>" --save-catalog "<dep>"`). Scaffold each new package from `packages/common/animation`
  (package.json, moon.yml, tsconfig.json, vite.config.ts).
- Names: the container is **Scene**, the record is **Element**, link ends are **Binding**, reusable scenes are
  **Component** + **Instance** (D-3, D-4, D-5). Paint order is `order`; `z` is depth (D-14).
- `@dxos/diagram` already exports a namespace `Scene` (its own scene layer). Inside `@dxos/diagram`, import the new
  package as `import { Scene as Model } from '@dxos/scene'`. Everywhere else the new namespace is plain `Scene`.
- Typenames: `org.dxos.type.scene.scene2d@0.1.0` and `org.dxos.type.scene.scene3d@0.1.0`.
- Element ids are never positional; the id `camera` is reserved (animator target).
- 2D units are canvas px; 3D units are scene units; the 2D-in-3D mapping is `(x, y) → (x/100, 0, y/100)`.
- Renderers never write ECHO; stage bindings are plain data (`structuredClone`-safe).
- No casts (`as any`, `as unknown as`, `!`). Relative imports carry `.ts`/`.tsx`. Effect over Promises except at the
  Manifold dynamic-import boundary.
- Run one test file with `pnpm --filter <pkg> exec vitest run --project=node <file>`. Format with `pnpm format` and
  commit by pathspec (`git add` new files first) after every task.
- Out of scope for stage 2: editing tools, placement relations (`right-of`…), Instance rendering, plugin-canvas
  migration, Composer app registration, deriving ids from labels.

## Review Focus

1. A link or group naming an element id that does not exist → a parse problem, and the renderer skips it without
   throwing. (Task 1, Task 4, Task 7.)
2. A child-scene cycle (a contains b contains a) → a problem, and rendering stops at the repeat. (Task 2, Task 7.)
3. Duplicate element ids, or an element called `camera` → a problem naming the id. (Task 1.)
4. A solid whose operand is missing, or whose result Manifold rejects → the solid draws its operands raw and logs once;
   the scene still renders. (Task 8.)
5. An empty scene or empty child scene → bounds are zero-size and fitting does not divide by zero. (Task 2.)

---

### Task 1: `@dxos/scene` schemas and validation

**Files:**

- Create: `packages/common/scene/` (scaffold), `src/index.ts`, `src/Scene.ts`, `src/validate.ts`
- Test: `packages/common/scene/src/validate.test.ts`

**Interfaces:**

- Produces (namespace `Scene`, from `src/Scene.ts`):
  - `Vec2 {x, y}`, `Vec3 {x, y, z}`, `Size2 {width, height}`.
  - `Style {hue?: string, tone?: 0|1|2|3, surface?: 'solid'|'tint'|'glass'|'none', border?: boolean, rounded?: boolean,
opacity?: number}` — `opacity` carries `AnimatableAnnotation` (`number`).
  - `Binding {element: string, anchor?: string}`.
  - `Layout {kind: string, params?: Record<string, unknown>}` (an arrangement a group applies to its members, D-15) and
    `pinned?: boolean` on elements.
  - `ElementBase {id, kind, order?: string, layer?, hidden?: boolean, locked?, label?: string, style?: Style,
from?: Binding, to?: Binding, members?: string[], layout?: Layout, pinned?: boolean, scene?: string,
props?: Record<string, unknown>}`. `scene` is the child scene's id in record form.
  - `Element2D = ElementBase & {center?: Vec2 (point), size?: Size2 (size), rotation?: number}` and
    `Element3D = ElementBase & {position?: Vec3 (vec3), scale?: Vec3 (vec3), rotation?: Vec3 (rotation)}`; the
    parenthesised kinds are their `AnimatableAnnotation`s. Geometry is optional because a link's comes from its
    bindings.
  - `Camera2D {center: Vec2, zoom: number}`; `Camera3D {target: Vec3, yaw: number, pitch: number, distance: number,
fov: number, projection: 'perspective'|'orthographic'}` (angles in degrees).
  - Record form: `SceneRecord2D {id, dim: '2d', name?, theme?, component?: boolean, camera: Camera2D,
elements: Record<string, Element2D>}`, `SceneRecord3D` likewise with `'3d'`, `SceneRecord = SceneRecord2D |
SceneRecord3D`, `SceneDocument {scenes: SceneRecord[]}` (first scene is the root).
  - ECHO types `Scene2D` and `Scene3D` (`Type.makeObject`, typenames above, `Annotation.UserType`), whose fields are the
    record form with two changes: the record `id` is stored as `key` (ECHO reserves `id`), and `scene` on elements is
    replaced by `child?: Ref.Ref(Obj.Unknown)`.
  - Kind lists: `KINDS_SHARED = ['link', 'label', 'scene', 'group', 'instance']`,
    `KINDS_2D = ['rect', 'ellipse', 'polygon', 'path', 'note', 'image']`,
    `KINDS_3D = ['cube', 'sphere', 'cylinder', 'cone', 'pyramid', 'mesh', 'solid']`.
- Produces (`src/validate.ts`): `type Problem = {scene: string, element?: string, message: string}`;
  `validateDocument(doc: SceneDocument): Problem[]`.

- [ ] **Step 1: Scaffold the package** from `packages/common/animation`, `private: true`, deps `@dxos/echo`,
      `@dxos/animation` (`workspace:*`), `effect` (catalog). `pnpm install`.
- [ ] **Step 2: Write failing tests** in `validate.test.ts`:
  - `reports a duplicate element id` → one problem whose `element` is the id.
  - `reports the reserved id camera` → `message` contains `camera`.
  - `reports a link bound to a missing element` and `reports a group member that does not exist`.
  - `reports a kind from the other dimension` (a `sphere` in a 2D scene).
  - `reports a child scene id that is not in the document`.
  - `accepts the A→B→C scene` (three elements, two links) → `[]`.
- [ ] **Step 3: Run** `pnpm --filter @dxos/scene exec vitest run --project=node src/validate.test.ts` → FAIL.
- [ ] **Step 4: Implement** `Scene.ts` and `validate.ts` with the signatures above.
- [ ] **Step 5: Run** the tests → PASS; `npx tsc --noEmit -p tsconfig.json` → clean.
- [ ] **Step 6: Commit** `scene: schemas and validation for 2D and 3D scenes`.

### Task 2: Layout, bounds and hierarchy

**Files:**

- Create: `packages/common/scene/src/layout.ts`, `src/hierarchy.ts`
- Test: `src/layout.test.ts`, `src/hierarchy.test.ts`

**Interfaces:**

- Consumes: Task 1 types; `Arranger` from `@dxos/animation`.
- Produces:
  - `ring: Arranger`, `grid: Arranger` (3D, positions as `Vec3`; params `radius`, `columns`, `spacing`), and
    `LAYOUTS_3D: Record<string, Arranger> = {ring, grid}`. Port the maths from
    `plugin-spacetime/src/animator/layouts.ts` (copy; spacetime is retired in stage 3).
  - `applyLayout(scene: SceneRecord3D): SceneRecord3D` — for each group with `layout`, writes `position` on members that
    are neither `pinned` nor already positioned.
  - `bounds2D(scene: SceneRecord2D): {x, y, width, height}`; `bounds3D(scene: SceneRecord3D): {center: Vec3, radius}`
    (zero when empty).
  - `fitChild(frame: {center: Vec3, radius: number}, child: {center: Vec3, radius: number}): {offset: Vec3, scale:
number}` — scale is `frame.radius * 0.8 / child.radius`, or 1 when the child radius is 0 (D-23).
  - `sceneTree(doc: SceneDocument): {order: string[], problems: Problem[]}` — depth-first from the root; a repeated
    scene id is a problem (`cycle`) and is not descended.

- [ ] **Step 1: Write failing tests:** `ring places n members on a circle of the radius`; `applyLayout keeps a pinned
    member`; `bounds of an empty scene are zero`; `fitChild of an empty child has scale 1`;
      `sceneTree reports a cycle and stops`.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `scene: layout, bounds and scene hierarchy`.

### Task 3: ECHO conversion

**Files:**

- Create: `packages/common/scene/src/echo.ts`
- Test: `src/echo.test.ts`

**Interfaces:**

- Produces: `toEcho(doc: SceneDocument): {root: Scene2D | Scene3D, scenes: Map<string, Scene2D | Scene3D>}` — children
  are made first so `child` holds `Ref.make(childObject)`; `fromEcho(root: Scene2D | Scene3D): SceneDocument` — walks
  loaded refs depth-first and uses each object's `key` as the record id.

- [ ] **Step 1: Write the failing test** `toEcho then fromEcho returns the same document` over a two-scene document
      (B contains a sub-scene).
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `scene: convert scene documents to and from ECHO`.

### Task 4: `.dx` grammar and parser for scenes

**Files:**

- Modify: `packages/common/diagram/src/dsl/diagram.grammar`, `src/dsl/parse.ts`, `src/dsl/index.ts`,
  `packages/common/diagram/package.json` (dep `@dxos/scene`)
- Create: `src/dsl/scene-model.ts`
- Test: `src/dsl/scene-model.test.ts`

**Interfaces:**

- Grammar additions (contextual keywords via `ckw`, so documents using these words as ids keep parsing):
  - `SceneDecl { ckw<"scene"> Id Attribute* "{" (CameraStmt | ElementStmt)* "}" }` — attributes `dim=2d|3d`,
    `theme=`, `name=`, `component=true`.
  - `CameraStmt { ckw<"camera"> Attribute* }`.
  - `ElementStmt { ckw<"element"> Id Word Label? ("@" (Point3 | Point))? Attribute* }` — the `Word` is the kind.
  - `Point3 { Number "," Number "," Number }`; token `size3 { decimal "x" decimal "x" decimal }` with
    `@precedence { size3, size, number }`.
  - Element attributes: `size=WxH`, `scale=WxHxD` or a number, `rotation=`, `order=`, `layer=`, `hidden=true`,
    `pinned=true`, `from=<id>`, `to=<id>` (`id#anchor`), `members="a b c"`, `layout=<kind>` with layout params as
    `layout-<param>=<value>`, `scene=<id>`, style tokens `hue= tone= surface= border= rounded= opacity=`, and any other
    attribute into `props`.
- Produces (`scene-model.ts`, exported from `Dsl`): `readScenes(text: string): {document: Model.SceneDocument,
problems: Problem[]}`. It parses, then runs `applyLayout` on 3D scenes, then appends `validateDocument` problems.
  Statements outside a `scene` block are ignored by `readScenes` and handled by the existing `read`.

- [ ] **Step 1: Write failing tests:** `parses a 2D scene with a camera and three elements`; `parses a 3D point and a
    WxHxD scale`; `an id called scene still parses in an object statement` (existing syntax unaffected);
      `reports a link to a missing element` (from `validateDocument`).
- [ ] **Step 2: Run** `moon run diagram:prebuild-lezer` then the test → FAIL.
- [ ] **Step 3: Implement** the grammar and `readScenes`.
- [ ] **Step 4: Run** the new test and the existing `src/dsl/dsl.test.ts` and `src/dsl/semantic.test.ts` → PASS.
- [ ] **Step 5: Commit** `diagram: scene, camera and element statements`.

### Task 5: Printer and the eight exemplars

**Files:**

- Modify: `packages/common/diagram/src/dsl/scene-model.ts`, `src/testing.ts`
- Create: `packages/common/diagram/src/testing/exemplars/{square,links,subscene,cube,cluster,encapsulated,hierarchy,solid}.dx`
- Test: `src/dsl/scene-model.test.ts`

**Interfaces:**

- Produces: `printScenes(doc: Model.SceneDocument): string` — canonical order: scene attributes, camera, then elements
  sorted by `order` then id; attributes in a fixed order; positions always printed. `EXEMPLARS: Record<ExemplarName,
string>` from `@dxos/diagram/testing` (load the `.dx` files with `?raw` imports).
- Exemplar content (spec §Stage 2):
  1. `square`: one `rect` with `surface=solid border=true rounded=true` and a label.
  2. `links`: `rect` A, B, C and links `a→b`, `b→c` with `end=arrow`.
  3. `subscene`: as `links`, with B of kind `scene` pointing at a second scene `b-detail` holding two rects and a link.
  4. `cube`: one `cube` with `surface=glass border=true rounded=true`.
  5. `cluster`: a hub `sphere` and three spheres in a `group` with `layout=ring layout-radius=3`, linked hub→each.
  6. `encapsulated`: root holds a `sphere`-framed `scene` element (`props.shape=sphere`) pointing at `cluster`.
  7. `hierarchy`: three levels of 6, two child scenes at level 2.
  8. `solid`: a `cube` and a `cylinder` (both `hidden=true`), a `solid` `diff` with
     `props op=difference operands="box hole"`, and a `solid` `top` with `op=extrude target=diff face=0,1,0
distance=0.5` (extruding the +y face).

- [ ] **Step 1: Write failing tests:** for each exemplar, `round-trips <name>` asserts
      `printScenes(readScenes(text).document) === text` and `problems` is empty; `an intent-only cluster prints with
    positions` asserts the printed text of `cluster` without positions equals the canonical `cluster.dx`.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement** `printScenes` and write the exemplar files in canonical form.
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `diagram: print scenes, and the eight exemplar scenes`.

### Task 6: `@dxos/react-ui-scene` and the 2D renderer

**Files:**

- Create: `packages/ui/react-ui-scene/` (scaffold from `packages/ui/react-ui-animation`), `src/canvas/adapter.ts`,
  `src/components/Scene2DView/Scene2DView.tsx`, `src/components/Scene2DView/Scene2DView.stories.tsx`
- Test: `src/canvas/adapter.test.ts`

**Interfaces:**

- Consumes: `SceneDocument`, `EXEMPLARS`, `readScenes`.
- Produces: `toCanvasStore(doc: SceneDocument, theme?: string): {store: ViewStore, root: ViewId}` (from
  `createMemoryStore`) — `rect`/`ellipse` → nodes of the same type; `scene` → a `view` node whose `scene` is the child
  View id; `link` → a `line` link with `{node}` endpoints; style tokens map to `NodeStyle` (`surface: none` →
  `fill: false`); `order` → node `z`. `Scene2DView({document, theme?, camera?: Camera2D})` renders `Canvas.Root`
  read-only.
- Story `components/Scene2DView`, args `exemplar: 'square'|'links'|'subscene'`, `theme: 'flat'|'outline'|'glass'|
'classic'`, `camera: 'fit'|'close'`.

- [ ] **Step 1: Write failing tests:** `maps a link to a line link between the bound nodes`; `maps a scene element to a
    view node over the child view`; `skips a link whose binding is missing` (Review Focus 1).
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement** the adapter, view and story.
- [ ] **Step 4: Run** → PASS; open the story in storybook (9009), check all three exemplars in each theme, and no
      console errors.
- [ ] **Step 5: Commit** `react-ui-scene: render 2D scenes through react-ui-canvas`.

### Task 7: The 3D renderer

**Files:**

- Create: `src/three/camera.ts`, `src/three/materials.ts` (copied from `plugin-spacetime/src/containers/SpacetimeStage/
materials.ts`), `src/three/renderer.ts`, `src/three/labels.tsx` (adapted from spacetime `StageLabels.tsx`),
  `src/components/Scene3DView/Scene3DView.tsx`, `.stories.tsx`
- Test: `src/three/camera.test.ts`, `src/three/renderer.test.ts`

**Interfaces:**

- Produces:
  - `toOrbit(camera: Camera3D): {alpha, beta, radius, target}` (Babylon `ArcRotateCamera`; `alpha = -yaw` in radians,
    `beta = π/2 - pitch`), `project(camera: Camera3D, viewport, point: Vec3): {x, y} | undefined`.
  - `materialSpec(style: Style | undefined, theme: 'cad'|'presentation'): {color: string, kind: 'standard'|'pbr'|'rim',
alpha: number, edges: boolean}` — `surface: glass` → `rim` in presentation, `standard` with alpha 0.4 in cad;
    `border` → `edges`.
  - `class SceneRenderer3D { constructor({canvas, theme}); render(doc: SceneDocument, camera: Camera3D,
overrides?: Record<string, Partial<Element3D>>): void; dispose(): void }` — renders on demand (no loop): primitives
    via `MeshBuilder`; a rounded `cube` via a Manifold hull of eight corner spheres (radius `0.15 * min(scale)`);
    `border` via `enableEdgesRendering`; links as lines between bound elements; a `scene` element draws its frame
    (sphere shell for `props.shape=sphere`) and recursively draws the child scene transformed by `fitChild`, stopping on
    a repeated scene id (Review Focus 2).
  - `Scene3DView({document, theme, camera})` with HTML labels.
- Story `components/Scene3DView`, args `exemplar: 'cube'|'cluster'|'encapsulated'|'hierarchy'`, `theme: 'cad'|
'presentation'`, `camera: 'iso'|'front'|'close'|'wide'` (`wide` uses `fov=1.2`, `front` uses `projection=
orthographic`).

- [ ] **Step 1: Write failing tests:** `toOrbit maps yaw 0 pitch 0 to looking along -z`; `materialSpec makes glass a rim
    in presentation`; `render list skips a link whose target is missing`; `render list stops at a scene cycle` (test the
      pure `renderList(doc): Item[]` the renderer draws from, so no WebGL is needed).
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement** `renderList`, the renderer, the view and the story.
- [ ] **Step 4: Run** → PASS; check the four exemplars in each theme and camera in storybook, no console errors.
- [ ] **Step 5: Commit** `react-ui-scene: Babylon renderer for 3D scenes`.

### Task 8: Solids

**Files:**

- Create: `src/three/solid.ts` (boolean code ported from `plugin-spacetime/src/engine/boolean-ops.ts` and
  `extrusion.ts`)
- Modify: `src/three/renderer.ts`, Scene3DView story (add `solid`)
- Test: `src/three/solid.test.ts`

**Interfaces:**

- Produces: `evaluateSolid(scene: SceneRecord3D, id: string, wasm: ManifoldToplevel): {mesh: MeshData} | {error:
string}` where `MeshData = {positions: Float32Array, indices: Uint32Array}`; ops `union` and `difference` over
  `operands` (in order), and `extrude` of `target`'s face whose normal matches `face` by `distance`. Primitive operands
  are built at their `position`/`scale`/`rotation`. `getManifold()` loads `manifold-3d` lazily.

- [ ] **Step 1: Write failing tests:** `difference has less volume than its first operand`; `extruding +y by 0.5 adds
    width×depth×0.5 of volume`; `a missing operand returns an error` (Review Focus 4).
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement**; the renderer draws `{error}` solids as their operands, unhidden,
      and logs once.
- [ ] **Step 4: Run** → PASS; check `solid` in storybook.
- [ ] **Step 5: Commit** `react-ui-scene: solids as operation trees evaluated with Manifold`.

### Task 9: 2D scenes through a 3D projection

**Files:**

- Create: `src/three/lift.ts`
- Modify: `Scene2DView.tsx` (prop `renderer?: 'dom'|'3d'`), its story (arg `renderer`, camera `tilted`)
- Test: `src/three/lift.test.ts`

**Interfaces:**

- Produces: `liftScene(doc2d: SceneDocument): SceneDocument` — each 2D scene becomes a 3D scene: `rect` → `cube` with
  scale `(w/100, 0.04, h/100)`, `ellipse` → `cylinder` likewise, `scene` → flat frame plus child, links and style kept,
  position `(x/100, 0, y/100)`; `camera2DTo3D(camera: Camera2D, aspect): Camera3D` (top-down, orthographic, `pitch=90`).
  The 3D camera for a tilted view is passed in, never stored (D-17).

- [ ] **Step 1: Write failing tests:** `an element right of the origin in 2D is at +x in 3D`; `the top-down camera frames
    the same bounds as the 2D camera`.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** → PASS; check `links` and `subscene` with
      `renderer=3d` and `camera=tilted`.
- [ ] **Step 5: Commit** `react-ui-scene: draw 2D scenes in 3D`.

### Task 10: `plugin-scene` and the animator stages

**Files:**

- Create: `packages/plugins/plugin-scene/` (scaffold from `plugin-animator`, `private: true`), `src/types/index.ts`
  (re-exports the ECHO types and registers them in the plugin's schema module), `src/stages/scene2d.ts`,
  `src/stages/scene3d.ts`, `src/containers/SceneStage/SceneStage.tsx`, `src/testing/animations.ts`,
  `src/containers/SceneStage/SceneStage.stories.tsx`
- Test: `src/stages/stages.test.ts`

**Interfaces:**

- Consumes: `AnimatorCapabilities.StageDef` (`@dxos/plugin-animator/AnimatorCapabilities`), Tasks 3, 6, 7, 9.
- Produces:
  - `scene2dStage: StageDef` — `camera: {kind: '2d'}`, `renderers: ['2d', 'overlay']`, `scriptProperties: {position:
'center', scale: 'size', opacity: 'style.opacity'}`, targets = root-scene elements with their annotated paths.
  - `scene3dStage: StageDef` — `camera: {kind: 'orbit'}`, `renderers: ['3d', 'overlay']`, `layouts: LAYOUTS_3D`,
    default script properties, `bind` returns plain `{objects, links}`.
  - `makeExemplarAnimation(name: ExemplarName): Animation` — one shot: 2D moves A and changes C's hue, camera zooms;
    3D rings the cluster in, orbits the camera.
- Story `containers/SceneStage`, arg `exemplar` (all eight), playing through `AnimationPlayer`.

- [ ] **Step 1: Write failing tests:** `2D targets expose center and size`; `3D binding survives structuredClone`;
      `no target is called camera`.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** → PASS; scrub each exemplar in storybook (the
      pane throttles rAF, so scrub rather than play).
- [ ] **Step 5: Commit** `plugin-scene: animator stages for 2D and 3D scenes`.

### Task 11: Record what was built

**Files:**

- Create: `packages/plugins/plugin-scene/PLUGIN.mdl` (from `packages/reflect/deus/lang/PLUGIN-.template.mdl`, with a
  `## Changelog` citing the design's user decisions as `user:richburdon` and the agent calls as `agent:claude-code`),
  `packages/plugins/plugin-scene/docs/TASKS.md` (stage 3 follow-ups and anything found in Tasks 6–10)
- Modify: the design doc's status line to name this plan.

- [ ] **Step 1: Write the spec and ledger.** **Step 2: Run** `pnpm deus changelog check` → OK and
      `pnpm deus lint --only mdl/decision packages/plugins/plugin-scene/PLUGIN.mdl` → clean.
- [ ] **Step 3: Run** the full checks: `moon run scene:test diagram:test react-ui-scene:test plugin-scene:test` (in the
      background) and `moon run :lint -- --fix` on the four packages.
- [ ] **Step 4: Commit** `plugin-scene: spec and task ledger for stage 2`.
