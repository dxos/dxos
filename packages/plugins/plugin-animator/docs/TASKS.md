# plugin-animator — Tasks

_Resume: Phase 3b built (spacetime stage, presentation look, labels, echo3d fixture); next is Phase 4, export. Uncommitted: none. Last: the echo3d Animation story in plugin-spacetime._

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
- [x] Effect operation keys renamed to the verbNoun shape (D-29); `Render` keeps its single-word key.

## Phase 3a: Effects and screen text

- [x] Renderer-neutral effect items in `@dxos/animation` (`Shape2D`, `Instance3D`, `OverlayItem` and their guards);
      the canvas `Shape` extends `Shape2D`; `beatTimes` shared by the script compiler and screen text.
- [x] Effect runtime in plugin-animator (`src/effects`): `EffectCore` (worker and in-process), `EffectHost`, the
      effect worker entry (`@dxos/plugin-animator/effect-worker`), bindings sampled ahead from `StageDef.bind` (D-25),
      keyed parameters, and `checkEffect`.
- [x] Built-ins as installable sources: packet flow (`2d`, `3d`), burst (`2d`, `3d`), conversations and callout
      (`overlay`); `InstallEffects`.
- [x] Operations `CreateEffect`, `UpdateEffect`, `CheckEffect`, `PlaceEffect`, `InstallEffects`.
- [x] Overlay layer above the stage, anchored through the stage's `StageProjection` (D-27).
- [x] Screen text (F-8.3, F-8.5): captions with staggered lines, side title, image headline, curtain; beats and
      `Shot.screen`; opacity computed from time (D-28).
- [x] Canvas stage: `bind`, `2d` effects drawn through the shared `ShapeLayer` under the camera, projection reported.
- [x] Story: `AnimatorArticle` `Effects` over the dots stage (packet flow, conversations, caption, side title,
      curtain). Not run in this phase.

### Phase 3a follow-ups

- [ ] Export handshake with effects: `onFrameDrawn` should wait for the effect frame of the same `t` (Phase 4).
- [ ] Effects in the article UI: an "Add effect" action, effect rows on the timeline, paused-effect warnings.
- [ ] Canvas links bind as straight centre-to-centre lines; bind the routed path where the router can run headless.
- [x] Label morph (echo3d) belongs to the stage's labels (F-8.2), not to an effect; done in Phase 3b (D-30).
- [ ] Storybook play test for the `Effects` story and a check that the effect worker loads from the bundle.

## Phase 3b: 3D

- [x] Spacetime stage in plugin-spacetime (`AnimatorStage` module on `AnimatorEvents.Start`, `SpacetimeStage`
      container, `src/animator`): `AnimatableAnnotation` on `Model.Object` (with new `opacity` and `labelStyle`),
      scene objects as targets, an orbit camera, a Babylon render per sample with no render loop (D-31), `bind` in world
      coordinates, `onProjection` from projection math tested against Babylon's `NullEngine`.
- [x] `3d` frames drawn as thin instances of a unit sphere and cube, with per-instance colour and opacity.
- [x] Arrangers `ring`, `orbit`, `grid`, `containment` (echo3d's `pack`).
- [x] Presentation look per scene (`Scene.style`, D-32): dithered PBR, rim shader with noise and a lattice on shells,
      night-blue background with a lattice sphere; CAD stays the default. `Scene.links` for drawing and binding.
- [x] Labels (F-8.1, F-8.2): DOM labels beside projected objects in `hero`, `title`, `inside`, `plain` or `hidden`,
      fading with their object; word-sliding morph from `labelFrom`/`labelMorph` and `labelMorphBeats` (D-30).
- [x] T-4: `makeEcho3dAnimation` (plugin-spacetime `src/testing/echo3d.ts`), twelve of echo3d's 28 slides over four
      scenes: beginning, silo, silo-comms, spread, frontier, frontier-comms, absorb, merge-1/merge-2/final-frontier
      (one shot), engulf, echo-spaces, object-thread, company-fills. Story `SpacetimeStage` `Echo3d`; `Default` and
      `Presentation` play a demo of every layout, the morph and the effects. Stories not run in this phase.
- [x] Merge as a 3D visual: the script's `merge` beat is enough for the labs; the apps' absorb uses `hide` + `set`
      because a `merge` compounds its growth over several beats.

### Phase 3b follow-ups

- [ ] The other 16 echo3d slides (blank, scale, competitors, spread-comms, orbit, rivals, dont-panic, spread-again,
      echo-hub, objects, object-detail, object-created, echo-spaces-again, echo-hub-again, saas-merge), and the
      prototype's spin and turn (an orbit as keyed rotation), swallow shake, and per-scene link sets.
- [ ] The curtain draws over captions, so engulf's caption cannot come up on the black as in echo3d; give screen text
      a layer order.
- [ ] `merge` grows the survivor by area per beat; a growth parameter would let staggered merges grow it gently.
- [ ] Presentation style per object, if a slide ever mixes looks; the echo3d vendor's near-solid back wall
      (`backOpacity`).
- [ ] The editor (`SpacetimeCanvas`) ignores `opacity`, `labelStyle`, `rotation` and `links`.
- [ ] Storybook play test for the `SpacetimeStage` stories (frame time, label positions against `onProjection`).
- [ ] Engulf (shot 9): the companies ring sits off the merged lab's centre near the top of the frame, and the burst
      barely spreads; fix the fixture's layout.
- [ ] End card (shot 12): echo3d fills the hub orange behind the DXOS headline; the fixture shows only the headline.
- [ ] Jumping to a shot lands on the first frame of its fade-in (black); consider landing after the transition.

## Phase 4: Export and studio

- [ ] In-app WebCodecs export; studio `GenerationService` provider; CLI form.

## Phase 5: EDGE render

- [ ] Render job in an EDGE sandbox container.

### References

- `packages/ui/react-ui-canvas/docs/ANIMATION.md` — the canvas animation design this extends.
- `tools/autocue/showcase/echo3d/` — the Three.js prototype whose effects are ported.
- `packages/plugins/plugin-studio/docs/DESIGN.md` — clips, variants and generation providers.
