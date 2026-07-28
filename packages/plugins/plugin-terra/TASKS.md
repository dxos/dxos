# plugin-terra — Tasks

_Resume: watch PR #12353's Check go green after the sampler-memoization fix, then land it. Uncommitted: none. Last: fixed the real cause of the red `storybook` job — `makeSampler` was rebuilt inside `evaluate` on every smoke puff (28.2ms/frame at 20 objects), timing the `Objects` story out; memoized in `engine/noise.ts`, story now 0.32s. 103 node tests + 3 storybook tests green. Still pending: visual confirmation of the flush bow and retuned wakes — the browser pane reports `visibilityState: hidden` with a 0x0 viewport, so screenshots come back black; check the stories yourself._

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

### References

- Determinism contract and passability rules: [DESIGN.md](./DESIGN.md#phase-2--objects--simulation).
- Known seam: `SimEngine.#maybeReplan` should import `TerraObject.domainFor` rather than re-deriving the kind→domain mapping; watch for an import cycle.

## Backlog (Phase 3+)

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
