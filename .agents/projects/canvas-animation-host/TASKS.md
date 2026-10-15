# canvas-animation-host — tasks

Spec: `agents/superpowers/specs/2026-10-15-canvas-animation-host-design.md`. Execution: native (one session),
then one whole-branch review. Each task: tests first, `moon run react-ui-canvas:test` (or `plugin-canvas:test`),
typecheck, commit.

## Global constraints

- No casts to silence types; no wrapper divs; react-ui primitives only; toolbars via `useMenuActions` + `Menu.Root`.
- Relative imports carry `.ts`/`.tsx`. New public functions get JSDoc.
- Stored cameras and drawings without the new optional fields behave exactly as before.

## Review focus

1. Ungroup of a frame that was moved and resized after grouping: children land where they were drawn.
2. Ungroup of a scene shared by two frames: the other frame still opens it; ids do not collide.
3. A hidden node with links: links disappear with it, and reappear on show.
4. Presentation camera: no gesture writes to the model; returning to tilt 0 restores editing.
5. Override store: writes are dropped; a scene with no override is the same object (memo holds).

## Phase 1 — model (react-ui-canvas)

- [x] T1 `hidden` on `nodeBase` and `linkBase`; `visibleScene` drops hidden nodes/links (+ links to hidden nodes). Tests in `layers.test.ts`.
- [x] T2 `ungroupScene(scene, frameId, child, options?: { shared?: boolean }) => Intent[] | undefined` in `utils/group.ts`. Tests in `group.test.ts` (review focus 1, 2).
- [x] T3 `compoundTree(scenes, root) => CompoundEntry[]`, `compoundName(scenes, frame)` in `utils/scenes.ts`. `CompoundEntry = { path: NodeId[]; scene: SceneId; frame: FrameNode; child: SceneId; name: string; hidden: boolean; children: CompoundEntry[] }`. Tests in `scenes.test.ts`.
- [x] T4 Camera `tilt`/`spin` (optional); `isPresentation`, `cameraTransform(camera, viewport?)`, `ISOMETRIC`/`TOP` presets, `animateCamera` lerps tilt/spin. Tests in `camera.test.ts`.
- [x] T5 `applyOverrides`, `createOverrideStore` in `model/overrides.ts`; export. Tests in `overrides.test.ts` (review focus 5).

## Phase 2 — view (react-ui-canvas)

- [x] T6 SceneView: presentation gating (readonly capabilities, no wheel zoom-at-point, no auto-drill, selection cleared), `preserve-3d` on camera div and portal child; overlay JSDoc. Review focus 4.
- [x] T7 `useCompoundActions` (group, ungroup, rename, toggle hidden, frame, enter) shared by Properties + Objects; ⌘G / ⇧⌘G keys.
- [x] T8 `ObjectsPanel` (components/Objects) + `SceneView.Objects` inspector; `Objects.stories.tsx`.
- [x] T9 Stories: `Presentation.stories.tsx` (animate top ↔ isometric), `Override.stories.tsx` (time atom + overlay particle), nested compound objects story with Objects docked.
- [x] T10 DESIGN.md "Overrides" + "Presentation camera" sections.

## Phase 3 — plugin-canvas

- [x] T11 Mount `SceneView.Objects` in `CanvasArticle`; persistence round trip test in `store.test.ts` (compound name, hidden, ungroup removes scene record).

## Phase 4 — ship

- [ ] T12 `pnpm format`, lint, tests, verify stories on :9009, changeset, draft PR (submit-pr).

## Notes (2026-10-15)

- Storybook :9009 was serving `plugin-brain-evals-viz-643a0c` (off-limits), so stories were verified headless with
  `moon run react-ui-canvas:test-storybook` (Objects, Presentation, Override: 6/6), not in the shared server.
- `hidden` is excluded from the Properties form: a hidden element is not hit, so it could never be re-selected.
- Portal children stay coplanar under tilt without `preserve-3d` (2D transforms); the spec was updated.

## Follow-ups

- [ ] Screenshots of the Objects panel and the isometric view for the PR (needs the shared storybook on this worktree).
- [ ] Hit-testing under tilt: the ground plane is affine under an orthographic pose, so `screenToScene` can be inverted.
- [ ] Rename of a compound object is not an undo step (it writes the store, not the projection).
