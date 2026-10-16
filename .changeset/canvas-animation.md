---
'@dxos/react-ui-canvas': minor
---

The scene engine animates: composite objects, a timeline, and agent-written generators.

- Composite objects: a scene marked `kind: 'composite'` drawn by `instance` nodes; group as object, ungroup, make unique and place; `SceneView.Objects` lists them and opens one in isolation.
- Timeline: `Scene.timeline` of keyed tracks with easing, `sampleScene(scene, t)`, an animated projection that turns edits away from the start into keys, a per-view clock (`SceneViewAtoms.clock`), and `SceneView.Timeline` with space, `,` `.` `[` `]` and `K`.
- Generators: a `generator` node runs agent-written code in a worker (`@dxos/react-ui-canvas/generator-worker`) at a fixed 120 Hz with seeded random, checkpoints and a step budget, drawing `Shape` lists; the motion library is `@dxos/react-ui-canvas/motion`.
- `SceneView.Root exportable` publishes the clock for `scripts/render-story.mjs`, which now seeks it frame by frame; new `path` node type and `film` theme.
