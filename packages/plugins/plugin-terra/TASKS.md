# plugin-terra — Tasks

_Resume: Phases 1–2 landed (#12353). On branch `claude/plugin-terra-layout-cache-c82b1b`: the planet cache (see the task below) — 112 node + 6 storybook tests green, live-verified in storybook on port 9010, not yet a PR. Still pending from the prior session: visual confirmation of the flush bow and retuned wakes. Note the browser pane reports a 0x0 viewport (screenshots come back black) — drive storybook with Playwright instead, which does render._

Design and decisions: [DESIGN.md](./DESIGN.md).
Plans: [Phase 1](../../../agents/superpowers/plans/2026-07-26-plugin-terra.md) ·
[Phase 2](../../../agents/superpowers/plans/2026-07-27-plugin-terra-phase2-objects.md).

Executed with the `subagent-driven-development` skill: one implementer subagent
per task, a spec+quality review gate after each. Controller-side ledger:
`.superpowers/sdd/progress.md` (git-ignored scratch).

## Phase 1: Deterministic planet

Seed-driven cubed-sphere terrain, water level, biomes, instanced scatter, an
orbiting camera, and a live config panel — rendered from a `Terra` ECHO object.

### Tasks

- [x] **Brainstorm + design spec** — viewpoint, sphere mesh, MVP scope, config UX settled; spec committed.
- [x] **Library survey** — no maintained Babylon planet library exists; compose `simplex-noise` + `seedrandom` + Babylon built-ins.
- [x] **Babylon spike** — validated determinism, seamless cube-face edges, 60 fps at 512²/face; surfaced the winding, water-tint, `landGain`, and plateau issues. Reference code checked in under the spike directory.
- [x] **Task 1 — Scaffold the package** — `@dxos/plugin-terra` (private), catalog dep on `simplex-noise`, builds green.
- [x] **Task 2 — Seeded fBm noise sampler** — `engine/noise.ts`; elevation (unclamped, mountains may exceed 1) + moisture, 4 seeded channels.
- [x] **Task 3 — Cubed-sphere geometry** — `engine/cubed-sphere.ts`; seam test proves adjacent faces coincide at a real shared cube edge.
- [x] **Task 4 — Terrain displacement** — `engine/terrain.ts`; `radiusAt`/`seaRadius`/`latitude` with `landGain` + ocean bias.
- [x] **Task 5 — Biomes and palette** — `engine/biomes.ts` + `palette.ts`; polar caps gated on `poles` (default off), depth-shaded ocean.
- [x] **Task 6 — Planet assembly** — `engine/generate-planet.ts`; triangle-soup mesh + deterministic scatter.
- [x] **Task 7 — `Terra` ECHO type** — `types/Terra.ts`; 23-field `TerraConfig`, defaults, `toConfigValues`.
- [x] **Task 8 — Babylon SceneManager** — `engine/scene-manager.ts`; reversed winding, unclamped-beta camera, shift-drag pan, thin-instance scatter, material disposal on regenerate.
- [x] **Task 9 — TerraArticle container + story** — renders in storybook; verified solid from all angles including top-down.
- [x] **Task 10 — Babylon GUI controls + FPS widget** — superseded by Task 10b for config; the in-scene FPS readout survives as `engine/scene-fps.ts`.
- [x] **Task 10b — react-ui `Slider` + `TerraForm` panel** — new Radix-based `Slider` primitive in `@dxos/react-ui`; `TerraForm` via `react-ui-form` `fieldMap`; `labelEnd` slot added to `FormRow` so the value sits on the label line; schema `title` annotations for human labels; panel background. Sliders verified to regenerate the planet live.
  - Fixed: slider fields threw `Input must be used within Input` (renderer bypassed `Form.Row`'s `Input.Root`); added `TerraForm.test.tsx` and switched the node test project to `happy-dom`.
  - In flight: slider thumb circle is invisible (`is-4`/`bs-4` generate no CSS) — must always show, except when disabled.
- [x] **Task 11 — Capabilities + plugin wiring** — `create-object`, `react-surface` (Article + Section), lazy `capabilities/index.ts`; `TerraPlugin.tsx` registers create-object, schema, surface, translations, and the `PLUGIN.mdl` asset. Terra is now creatable in a space.
- [x] **Task 12 — Full verification** — `plugin-terra` test/lint/build green (24 tests); `react-ui` and `react-ui-form` suites green.
- [x] **Task 13 — Changeset** — `.changeset/react-ui-slider-primitive.md`, `@dxos/react-ui: minor` (the consumer-visible part is the new `Slider` primitive + `labelEnd` slot; plugin-terra itself is private).
- [x] **Final whole-branch review** — returned READY TO MERGE. Fix wave applied: ResizeObserver for container resize (real bug — canvas only resized on `window.resize`), Radix slider pin bump to clear React 19 warnings, PLUGIN.mdl text, Slider thumb a11y names, dependency trim. **PR #12353 opened; Check green.** All 14 CodeRabbit review comments addressed and replied to.

### References

- Per-task review findings and commit ranges: `.superpowers/sdd/progress.md`.
- Spike reference code: `agents/superpowers/specs/2026-07-26-plugin-terra-spike/`.

## Phase 2: Objects & simulation

Movable objects over the planet (boats, planes, satellites, tanks, rockets), two
of each, advanced per frame by a deterministic engine driven from ECHO
definitions. Plan written and committed; execution begins after Phase 1 closes.

### Tasks

- [x] **Brainstorm + design spec** — hybrid state model, determinism contract, module layout, motion models, A\* routing; spec committed.
- [x] **Implementation plan** — 9 tasks with interfaces, full test code, and verification commands.
- [x] **P2.1 — Spherical geometry (`sim/geo.ts`)** — `GeoPoint`↔`Vec3`, tangent frame, `bearingTo`, `advance`, `turnToward`.
- [x] **P2.2 — Navigation grid (`sim/nav-grid.ts`)** — cells from the Phase 1 sampler, cross-face neighbor stitching, per-domain passability.
- [x] **P2.3 — Route planning (`sim/route.ts`)** — A\* over the grid + line-of-sight smoothing.
- [x] **P2.4 — `TerraObject` ECHO type** — kind/speed/heading/source/target/orbit/`spawnedAt`; register the schema.
- [x] **P2.5 — Motion controllers (`sim/motion.ts`)** — **all closed-form in absolute time.** Redesigned mid-flight after PR review caught that per-frame `dt` integration breaks peer determinism; routed objects now walk their route polyline by arc length.
- [x] **P2.6 — Simulation engine (`sim/engine.ts`)** — absolute-time evaluation + replan-window recurrence; the key test asserts stepped-through and jumped-to evaluation reach identical state for routed objects.
- [x] **P2.7 — Object meshes (`scene/object-forms.ts`)** — one merged flat-shaded mesh per kind from primitives.
- [x] **P2.8 — Object layer + article integration** — thin instances, surface-normal orientation, render-loop tick, `makeDemoWorld` (two per kind), animated story.
- [x] **P2.9 — Smoke trails** — `sim/trail.ts` (pure ring buffer of puffs, spacing-based emission) + `scene/trail-layer.ts` (thin-instance translucent white spheres that grow and fade); ships, planes, rockets.
- [x] **P2.10 — Changeset** — none required: Phase 2 is entirely inside the private `plugin-terra` package. The only public-API change on this branch (the `react-ui` `Slider` + `react-ui-form` `labelEnd` slot) is already covered by `.changeset/react-ui-slider-primitive.md`.
- [x] **Article toolbar** (user directive) — `react-ui-menu` toolbar with play/pause and add-random-object. Pause holds a clock offset rather than halting evaluation, so the closed-form determinism model is preserved.
- [x] **Re-targeting on arrival + gradual turning** (user directive) — routed objects (boat/tank/plane) now pick a new, reachable destination on arrival and keep moving. First pass fit this into the existing fixed 20s replan-window recurrence in `sim/engine.ts` (`leg`/`arrived` added to `ObjectState`; each leg's destination seeded from `` `${config.seed}:${definition.id}:${leg}` `` via `seedrandom`, never `Math.random()`). Extracted `sim/reachable.ts` (`domainCandidates`, `pickReachableTarget`) out of `types/Terra.ts` so placement and re-targeting share one reachability helper instead of duplicating it. Rendered heading now eases toward `state.bearing` via a new `scene/heading.ts` (`easeHeading`, reusing `sim/geo.ts`'s `turnToward`) driven by real per-frame delta time in `object-layer.ts` — orientation-only, never fed back into position, matching the determinism contract.
- [x] **Arrival-driven legs (review fix)** — the fixed-window version above had a defect: an object that arrived early sat frozen for up to ~20s until the next window boundary before re-targeting, contradicting "gets a new destination and keeps moving." Replaced the fixed-cadence recurrence with variable-length legs: `ObjectState.windowIndex` → `legStart` (the elapsed second the current leg began); leg `n`'s duration is its own route length over `speed` (`motion.ts`'s new `routeLength`), so `sim/engine.ts`'s `cursorAt`/`advanceLeg` walk the leg chain forward and re-target the instant a route finishes, not on a clock. `REPLAN_INTERVAL_SECONDS`/`REPLAN_INTERVAL_MS` removed (no longer needed for anything); `MAX_CATCHUP_WINDOWS` renamed `MAX_CATCHUP_LEGS`, same bounded-catch-up-then-snap role. `DESIGN.md` updated to match. New tests in `engine.test.ts` prove no stall (dense position sampling straddling an arrival) plus stepped-vs-direct and late-joiner determinism across multiple legs, using a `plane`/`air`-domain fixture whose leg boundaries are computed exactly (via the exported `pickReachableTarget`) rather than guessed at.
- [x] **Memoize the noise sampler (CI fix)** — the `Objects` story timed out at 15s in CI (3/3 attempts) and took 22.7s with a retry locally. Cause: `makeSampler` seeds four simplex permutation tables and `sim/motion.ts` called it _inside_ `evaluate` (tank radius, rocket surface), which `sim/trail.ts` multiplies by ~25 puffs per object per frame. At 20 objects that was 28.2ms/frame of pure sampler construction. `engine/noise.ts` now memoizes on the config's noise fields (bounded 4-entry cache; semantically invisible since a sampler is a pure function of its config): 28.2ms → 0.87ms per frame, and the story from 22.7s → 0.32s.
- [x] **Object camera** (user directive) — toolbar toggle between the orbit camera and a `ChaseCamera` riding a randomly picked object, looking along its long axis; a satellite instead looks straight down its nadir, since a nose-forward view from orbit is empty space. Frame math shared via a new `scene/orientation.ts` (`objectFrame`, `SCALE_FACTOR`), extracted from the copy-pasted pair in `object-layer.ts`/`gizmo-layer.ts` — which also fixes the gizmo, whose rods previously ignored a rocket's pitch and drew level while it climbed.
- [x] **Thin-instance culling fix** — a followed object could vanish. Babylon recomputes a thin-instance mesh's bounding box only inside `thinInstanceSetBuffer`, and all three layers call that only when the instance _count_ changes, using `thinInstanceBufferUpdated` otherwise — so the box stays frozen wherever the objects were on that frame. Proven with a `NullEngine` probe: the `boat` box centre is bit-identical at t=0 and t=120s while the boats have moved to `(-0.948, -0.302, -0.104)`. Harmless under the orbit camera (the stale box is always in frame) but a close-up camera culls the whole kind. Fixed with `alwaysSelectAsActiveMesh` on the object/trail/gizmo bases: refreshing per frame would walk every instance for a cull that buys nothing, since these meshes span the globe anyway.

- [x] **Fix the flaky engine determinism test (CI fix)** — `engine.test.ts`'s stepped-vs-direct test hard-coded `expect(leg).toBe(3)` at `boundaries[2] + 500`. `TerraObject.make` mints a random id and the re-targeting seed is `(config.seed, definition.id, leg)`, so every _process_ draws a different destination sequence: leg durations were measured across runs at 391–2924ms (one leg as short as 112ms), and any leg under the 500ms constant put the engine on leg 4 instead. The engine was never non-deterministic — its output is fixed given a definition, and peers share the id via ECHO, so the runtime contract always held. Sample instants are now expressed as a fraction _within_ a leg (`withinLeg`), which cannot flip whatever the draw. 8/8 consecutive runs green. Earlier in the session this was misdiagnosed as a transient build-cache artifact; CI run 30317196524 disproved that.

- [x] **Cache generated planets** (user directive, 2026-07-31) — the article regenerated the planet on every mount, so a resize, an opened companion, or navigating back paid 1.3s at resolution 256 (5s at 512; measured). `engine/planet-cache.ts` caches by a stable key over `TerraConfigValues` and is held in a plugin capability (`TerraCapabilities.PlanetCache`) so it outlives the article; outside a plugin manager (stories, tests) the mount owns a private one. Retention is a byte budget, not an entry count — one mesh is 94–377MB. A hit also skips the 150ms regeneration debounce, and `SceneManager.render` no-ops on the planet it already drew. Verified live in storybook (`CachedManual`): mount → unmount → remount leaves `misses=1`, and the longest main-thread block drops from 1808ms to 352ms (Babylon engine + mesh upload, no generation).

- [x] **2D map view** (user directive, 2026-07-31) — `components/TerraMap`: objects from above on an equirectangular graticule, with each one's route, its current leg's origin (hollow circle) and destination (cross), a play/pause + new-destination toolbar, and the telemetry panel (rows now selectable, synced with the map). Route legs are subdivided along their great circle before projecting — drawn end to end they cut across the terrain they were planned around, badly so at high latitudes. `slerp` moved from `sim/motion.ts` to `sim/geo.ts` (its call site updated) so the view can share it. Land/sea backdrop is a one-per-degree raster of the same sampler and biome palette the 3D planet uses, memoized on the config and switchable off (`GridOnly` story). Live-verified: pause freezes and resume continues from the frozen instant, re-targeting replans from the object's current position, selection syncs both ways, background click clears it.

- [x] **Views, attention, and per-object re-targeting** (user directive, 2026-07-31) — four fixes on top of the map:
  1. Story toolbars were rendering greyed out and inert: `Menu.Toolbar` sets `disabled` whenever its attendable is unattended, and outside the deck nothing holds attention. New `src/testing/withAttention.tsx` decorator (`RootAttentionProvider` + `AttendableContainer`, focusing the first focusable descendant one frame after mount — `display: contents` leaves the container itself unfocusable, and the story subtree is not mounted yet on the first effect).
  2. A new destination no longer snaps the object's facing on the map: `useEasedHeadings` applies `scene/heading.ts`'s per-kind turn rate, as `ObjectLayer` already did in 3D. Measured on a plane: sim bearing jumps 293.8° → 66.6° while the drawn heading walks there over ~3s.
  3. `SimEngine.respawn(id)` re-derives one object from its changed definition; the story used to rebuild the whole engine, which restarts every other object's leg sequence from spawn (and snaps any object more than `MAX_CATCHUP_LEGS` in). Covered by an engine test asserting the other objects' states are untouched.
  4. `TerraArticle` gained 3D / 2D / Camera tabs (`@dxos/react-ui-tabs`, inside the menu toolbar) replacing the old camera-toggle action. The canvas stays mounted and merely `invisible` under the map, since the render loop is what advances the simulation the map draws. Camera view adds a `Select` of the objects; the choice is the same `selectedId` the map and telemetry select, so picking on the map then switching to Camera rides that object.

- [x] **Object behaviors, and planes that climb over terrain** (user directive, 2026-07-31) — new `sim/behaviors.ts`: one behavior per kind returning an attitude (radius + nose pitch), replacing the kind switches inside the motion controllers; `ObjectState.pitch` now drives `objectFrame` for every kind (the rocket's pitch moved out of `scene/orientation.ts` into its behavior). The plane's behavior follows terrain — see DESIGN.md for the climb-limited altitude envelope and why the pitch is read across a baseline rather than at a point (a pointwise slope over discrete samples read terrain roughness as course changes and flipped the nose between its limits several times a second). `walkRoute` and friends moved to `sim/path.ts`, which also gained `walkRouteSeries` (one polyline pass for a whole window) — without it the lookahead cost 1.83ms/frame for four planes at the trail sampler's rate, with it 0.97ms. Verified live: a plane climbs 6% → 10.5% over a range and settles back to 6%, nose up on the way.

- [x] **Rocket impact and exhaust** (user directive, 2026-07-31) — the exhaust was offset back along the ground track only, so a near-vertical launch hung its whole plume beside the arc instead of under it; `sim/trail.ts` now offsets along the pitched flight axis (`state.pitch`, which the behaviors work gave it). On impact a rocket is destroyed — `ObjectLayer` skips anything with `state.explosion > 0` — and a new `scene/explosion-layer.ts` draws concentric shells that expand and fade over it. `state.explosion` is closed-form like everything else in `sim/`: the impact instant is the arc over the speed, so the blast's progress follows from `elapsed` alone with no landing event to catch. Covered by NullEngine tests (concentric radii, decreasing opacity, expansion, burn-out) and sim tests, and visually by the new `scene/ExplosionGallery` story, which loops the blast at a fixed camera — reviewing it live otherwise means waiting out a minute-long flight and catching a 2.5s window. Two findings from that story: the shells needed _additive_ blending (three alpha-blended shells over a night sky came out muddy brown, each veiling the one inside it), and the chase camera ends up inside the blast, where front-face-only spheres show nothing — worth pulling the camera back when its target is destroyed.

### References

- Determinism contract and passability rules: [DESIGN.md](./DESIGN.md#phase-2--objects--simulation).
- The chase camera sits very close to a satellite (its body fills the frame). Pre-existing — the old toolbar action picked objects at random — but now easy to hit deliberately from the Camera select.
- Radix tabs and selects activate on `mousedown`, so a programmatic `element.click()` in a verification script silently does nothing; drive them with a real Playwright click.
- Pre-existing, unrelated: every article mount logs one `AdvancedDynamicTexture.update` TypeError from the Babylon GUI FPS widget under React StrictMode's double-mount — reproduces on the untouched `Default` story.
- Storybook flake: `TerraArticle > Objects` is fast alone (~0.4s) and after `Default` (~3.8s), but slow after `Hires` (~13s, sometimes past the 15s timeout). `Hires` renders a 512²/face mesh, and the GPU memory does not appear to be reclaimed before the next story mounts. Unresolved — the sampler memoization above removed the systematic CPU cost, not this ordering effect.
- Known seam: `SimEngine.#maybeReplan` should import `TerraObject.domainFor` rather than re-deriving the kind→domain mapping; watch for an import cycle.

## Backlog (Phase 3+)

- **Common layout for canvas views and canvas dialogs, shared with `react-ui-geo`**
  (tracked 2026-07-31) — `TerraArticle` (3D canvas, 2D map, overlay panels) and
  `react-ui-geo`'s globe/map surfaces each roll their own canvas + floating-panel
  arrangement; factor out one layout both use, including the dialog form.
- **Collision avoidance strategy for objects** (tracked 2026-07-27) — objects
  currently route independently and can pass through each other; needs a
  separation/avoidance model that stays deterministic across peers.
- **Simulate actual propulsion** (tracked 2026-07-27) — objects skid: motion is
  closed-form arc-length along a route at a constant speed, so heading eases
  visually while the position track ignores it. Needs thrust/drag and a turn
  radius that bends the _path_, not just the mesh — while staying closed-form in
  absolute time (or otherwise peer-deterministic).

Captured in [DESIGN.md](./DESIGN.md#backlog-phase-3) — surface camera + LOD,
zoom-dependent resolution, sun/day–night, clouds, polygon smoothing, fog, rivers,
effects (explosions/exhaust/smoke/trails), submarines, trains, rocket landing
sites, versor rotation, AI strategy instructions, MCP server, standalone iOS app.
