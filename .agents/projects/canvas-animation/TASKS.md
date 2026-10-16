# canvas-animation — TASKS

Design: `packages/ui/react-ui-canvas/docs/ANIMATION.md`. Stacked on PR #13992 (`claude/data-molecule-animation-c37783`).

## Phase 1 — composite objects and tweening

- [x] Model: `Scene.kind`, `Scene.timeline`, `instance` and `path` node types, `opacity`, `exposed`
- [x] `sampleScene`, easing, keys (`model/timeline.ts`) + tests
- [x] `animate(projection, clock)` intent rewrite (`model/animate.ts`) + tests
- [x] Compose / ungroup / duplicate / make unique / place (`utils/compose.ts`) + round-trip tests
- [x] Clock atoms + `useClock` (the only rAF loop); drift driven by the clock
- [x] `ObjectsPanel` docked beside Layers; isolation view (`Objects › name`, Escape returns)
- [x] `SceneView.Timeline` collapsed bar; space , . [ ] K keys; auto-key toggle
- [x] Camera tracks
- [x] `render-story.mjs` seeks the exposed clock and waits on `data-frame-time`

## Phase 2 — agent-written generators

- [x] `Generator` ECHO type; `generator` node type
- [x] Runtime core: fixed 120 Hz step, seeded random, checkpoints every 2 s, budget, errors pause
- [x] Worker host (no DOM/network/space), esbuild-wasm compile per version
- [x] Bindings resolved from the sampled scene each step
- [x] Generator layer (SVG per SceneLayer layer, `data-frame-time`)
- [x] Motion library: along, orbit, settle, then, jitter
- [x] plugin-canvas operations: generator.create/update/check/place, timeline.key; `canvas-generators` skill

## Demo

- [x] End-card story (composite logo, keyed entrances, shimmer generator authored via operations)
- [x] Export to `temp/`, comparison sheet against the ident MP4
- [x] ANIMATION.md updated
- [x] Draft PR with video + sheet (#14007)

## Follow-ups

- [ ] Properties shows Fill/Border on for a bare type (instance, path, generator): resolve the type's bare default there too
- [ ] Overrides editing UI (properties panel per inner node)
- [ ] Palette "Objects" group; drag a row from the Objects panel onto the canvas
- [ ] Export from a pinned production bundle rather than the dev storybook
- [ ] Phase 3: flow generator port, markers and caption overlay, nested time
