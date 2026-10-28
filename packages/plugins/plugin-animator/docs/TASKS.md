# plugin-animator — Tasks

_Resume: Phase 2 built; next is the Phase 2 follow-ups below, then Phase 3. Uncommitted: none. Last: canvas stage contributed, `View.timeline` removed._

## Phase 0: Review and design

Review what exists (react-ui-canvas animation and generators, plugin-spacetime, plugin-studio, echo3d, render
paths), design the plugin, and turn the approved design into an MDL spec.

### Tasks

- [x] **Review existing functionality** — findings in DESIGN.md §2.
- [x] **Draft the design** — `docs/DESIGN.md` with the architecture diagram (`docs/diagrams/architecture.dx`).
- [x] **Design approved by the user** — answers recorded in DESIGN.md §13.
- [x] **Write `PLUGIN.mdl`** — features F-1…F-7, decisions D-1…D-19 (D-13…D-19 are agent entries awaiting approval).

## Phase 1: Neutral core

- [x] **Extract `@dxos/animation`** from react-ui-canvas (schemas, timeline functions, clock, effect runtime); no re-exports.
      The generator worker entry, `GeneratorCore`/`GeneratorHost` and the motion library stay in react-ui-canvas: they
      depend on the canvas `View`, its geometry and its bundle entry.
- [x] **Extract `@dxos/react-ui-animation`** (`TimelineBar`, `useClock`, `useExposedClock`).
- [x] **Serializable `AnimatableAnnotation`** replacing the raw key; migrate react-ui-canvas.
- [x] **Value kinds**: vec3, rotation (slerp), colour (OKLab); a track's optional `kind` names the interpolation.
- [x] **Script compiler**: beats → keys, deterministic; hand keys win (DESIGN.md §5.3, F-3). Effects and captions
      compile to spans beside the timeline.
- [x] **Canvas regression**: existing canvas node tests pass unchanged (the easing and timeline-bar tests moved with
      their code). Storybook play tests not run in this phase.

## Phase 2: plugin-animator and the canvas stage

- [x] Scaffold the package (`"private": true`), `Animation` and `Effect` types, `AnimatorCapabilities.Stage`
      (`@dxos/plugin-animator/AnimatorCapabilities`), playback core (`src/model`: sequencing, script compile and merge,
      sampling), `AnimatorArticle` with a story over an in-story dots stage, and the `CreateAnimation`, `SetKey` and
      `SetScript` operations. Registered in composer-app's experimental set, off by default.
- [x] Canvas stage in plugin-canvas (`AnimatorStage` module on `AnimatorEvents.Start`, `CanvasStage` container,
      `src/model/stage.ts`): root-scene nodes as targets, `row`/`ring` layouts, the sample applied as held keys on the
      engine's animated projection, edits at a time reported through `onEdit` and keyed by the animator (F-2.5).
- [x] Canvas `View.timeline` and the `timeline` intent removed (F-2.3): `Canvas.Root` takes `timeline` and
      `onTimelineChange` from its host; `sampleView(scene, timeline, t)`; the generator worker receives the timeline
      beside the scene; `canvas.setTimelineKey` removed (the generators skill points at `animator.setKey`); stored
      scene timelines are no longer read and are dropped on the next write.

### Phase 2 follow-ups

- [ ] The canvas article has no timeline bar now; open a canvas's animation from it ("Animate" creating or opening a
      one-shot `Animation` over the drawing's canvas).
- [ ] Composite objects lost their own animation (Group/Ungroup no longer move tracks); key instances instead, or
      bring composite timelines back as animator data if wanted.
- [ ] Deleting a canvas node leaves its tracks in any shot over it (they key nothing); prune on delete or in the
      article.
- [ ] The canvas stage keys properties from the built-in node schemas only (`defaultNodeRegistry`); node types other
      plugins contribute key the shared properties.
- [ ] Undo of keys written from a stage edit goes through the Animation object, not the canvas history.
- [ ] Story for the article over the canvas stage, and storybook play tests (`AnimatorArticle`, react-ui-canvas
      `Animation`, plugin-canvas `EndCard`) — not run in this phase.
- [ ] Dissolve plays as a fade until a stage can draw two shots at once.
- [ ] Operation keys of the Phase 3+ operations (`effect.create`, `render`, …) still use the dotted form in PLUGIN.mdl;
      rename to the verbNoun shape when built (D-22).

## Phase 3: 3D

- [ ] Spacetime stage (clock-driven Babylon render, annotations on `Model.Object`).
- [ ] `3d` and `overlay` effect renderers; built-in packet flow, burst, conversations, merge.

## Phase 4: Export and studio

- [ ] In-app WebCodecs export; studio `GenerationService` provider; CLI form.

## Phase 5: EDGE render

- [ ] Render job in an EDGE sandbox container.

### References

- `packages/ui/react-ui-canvas/docs/ANIMATION.md` — the canvas animation design this extends.
- `tools/autocue/showcase/echo3d/` — the Three.js prototype whose effects are ported.
- `packages/plugins/plugin-studio/docs/DESIGN.md` — clips, variants and generation providers.
