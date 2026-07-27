# plugin-terra — Tasks

_Resume: dispatch Phase 1 Task 11 (capabilities + plugin wiring). Uncommitted: none. Last: `react-ui-form: add labelEnd slot; plugin-terra: polish config panel` + Phase 2 plan committed; a slider-thumb visibility fix is in flight._

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
- [ ] **Task 11 — Capabilities + plugin wiring**
  - `capabilities/create-object.ts` (mirror plugin-voxel), `capabilities/react-surface.tsx` (Article + Section filters), `capabilities/index.ts`.
  - Wire `TerraPlugin.tsx`: create-object, schema, surface, translations, `PLUGIN.mdl` asset.
- [ ] **Task 12 — Full verification**
  - `plugin-terra:test` / `:lint` / `:build` green; storybook regression incl. a top-down angle (winding guard).
  - Audit the diff for casts, non-null `!`, and narrative comments.
- [ ] **Task 13 — Changeset** — `.changeset/*.md` naming `@dxos/plugin-terra`.
- [ ] **Final whole-branch review** — most-capable-model reviewer over `merge-base..HEAD`; triage the Minor findings collected during the per-task gates (redundant `normalize()` in `cubed-sphere.test.ts`; JSDoc on vector primitives; `biomes.ts` field comments state what not why).

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
- [ ] **P2.1 — Spherical geometry (`sim/geo.ts`)** — `GeoPoint`↔`Vec3`, tangent frame, `bearingTo`, `advance`, `turnToward`.
- [ ] **P2.2 — Navigation grid (`sim/nav-grid.ts`)** — cells from the Phase 1 sampler, cross-face neighbor stitching, per-domain passability.
- [ ] **P2.3 — Route planning (`sim/route.ts`)** — A\* over the grid + line-of-sight smoothing.
- [ ] **P2.4 — `TerraObject` ECHO type** — kind/speed/heading/source/target/orbit/`spawnedAt`; register the schema.
- [ ] **P2.5 — Motion controllers (`sim/motion.ts`)** — surface, altitude, closed-form orbit, ballistic rocket.
- [ ] **P2.6 — Simulation engine (`sim/engine.ts`)** — clock, `spawnedAt`-derived replan schedule, determinism tests.
- [ ] **P2.7 — Object meshes (`scene/object-forms.ts`)** — one merged flat-shaded mesh per kind from primitives.
- [ ] **P2.8 — Object layer + article integration** — thin instances, surface-normal orientation, render-loop tick, `makeDemoWorld` (two per kind), animated story.
- [ ] **P2.9 — Changeset.**

### References

- Determinism contract and passability rules: [DESIGN.md](./DESIGN.md#phase-2--objects--simulation).
- Known seam: `SimEngine.#maybeReplan` should import `TerraObject.domainFor` rather than re-deriving the kind→domain mapping; watch for an import cycle.

## Backlog (Phase 3+)

Captured in [DESIGN.md](./DESIGN.md#backlog-phase-3) — surface camera + LOD,
zoom-dependent resolution, sun/day–night, clouds, polygon smoothing, fog, rivers,
effects (explosions/exhaust/smoke/trails), submarines, trains, rocket landing
sites, versor rotation, AI strategy instructions, MCP server, standalone iOS app.
