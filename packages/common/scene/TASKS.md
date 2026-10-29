# Scene model — Tasks

_Resume: write the stage 3 design (editing tooling) for review. Uncommitted: none. Last: stage 2 exemplars render and
animate in storybook._

Design: `agents/superpowers/specs/2026-10-28-scene-model-design.md`. Plan:
`agents/superpowers/plans/2026-10-28-scene-model-stage-2.md`. Spec: `SPEC.mdl`.

## Stage 2: exemplars

The shared model and its text form, proved by eight exemplar scenes that render in 2D, in 3D and in 2D-through-3D, and
play an animation.

### Tasks

- [x] **Schemas and validation** — `Scene2D`, `Scene3D`, `Element`, `Binding`, cameras, `validateDocument`.
- [x] **Layout, bounds and hierarchy** — ring and grid arrangers, `applyLayout`, `fitChild`, `sceneTree`.
- [x] **ECHO conversion** — `toEcho` / `fromEcho`, one object per scene, children by Ref.
- [x] **`.dx` statements** — `scene`, `camera`, `element` in `@dxos/diagram`; `readScenes`, `printScenes`.
- [x] **Eight exemplars** — `@dxos/diagram/testing` `EXEMPLARS`, each round-tripping.
- [x] **2D renderer** — `Scene2DView` through react-ui-canvas, updated in place per sample.
- [x] **3D renderer** — `Scene3DView` on Babylon: themes, labels, child scenes in their frames.
- [x] **Solids** — Manifold operation trees; rounded cubes.
- [x] **2D drawn in 3D** — `liftScene`, `camera2DTo3D`.
- [x] **Animator stages** — plugin-canvas `scene2dStage`, `scene3dStage`, `SceneStage` story over every exemplar.

### Follow-ups

- [ ] A flat frame's label floats half its width above it (the label anchor uses the largest scale).
- [ ] Child scenes in the 2D canvas show only on zoom or drill-in, not as a thumbnail inside their frame.
- [ ] 2D colour cannot be keyed: canvas hues are names, which OKLab colour keys cannot interpolate.
- [ ] The 2D stage reports no projection for overlay effects; the 3D stage does.
- [ ] The scene stages are not contributed by plugin-canvas or registered in Composer yet.
- [ ] No storybook play tests for the scene stories.
- [ ] **Publish `@dxos/scene` and `@dxos/animation`** (user, 2026-10-29) — published `@dxos/diagram` and
      react-ui-canvas depend on them. First publish and trusted publisher via `scripts/publish-package.mjs`
      (`npm-publishing` skill); remove `"private": true` only after the trusted publisher exists.
- [ ] Child-scene edits do not reach a playing stage: `useSceneDocument` subscribes to the root scene only.
- [ ] `bind` reads the stored scene (`fromEcho`) on every sample.
- [ ] Manifold load failure is unhandled and cached; until it loads, solids draw as unit boxes.
- [ ] `then`/`reduce` in `solid.ts` leak a Manifold when a step throws.
- [ ] Duplicate element ids share one render-list key.
- [ ] Printer edge cases: prop names that are not names, member ids with spaces or `#`, `-0`, `order=10` reads back as a
      string.
- [ ] Silent drops in the reader: 3D `rotation=<number>`, 2D `scale=`, 3D `size=`, out-of-range `tone`, a second
      `camera`; `zoom=0` divides by zero.

## Stage 3: editing tooling

Decided by the user (2026-10-28): the editor grows inside plugin-canvas; 3D editing starts with arranging parts (place,
move, rotate, scale, group, link), then extrude and join/subtract; existing canvases migrate to Scene/Element within
stage 3; the work stays in dxos/dxos#14282.

- [x] **Write the stage 3 design** — `agents/superpowers/specs/2026-10-28-scene-editor-design.md`; every question
      decided 2026-10-29 (decisions 1–13).
- [x] **Write the stage 3 plan** — `agents/superpowers/plans/2026-10-29-scene-editor-stage-3.md`, 20 tasks in four
      phases (A 9, B 5, C 4, D 2), revised for the widened `Drawing.canvas` Ref and every-mode parity.
- [ ] **Execute the plan** — waits for the user's review of the plan.
- [ ] Follow-up: a Library panel listing components (use case 6).
- [ ] Follow-up: converge react-ui-canvas's `Intent` with `SceneIntent`.
