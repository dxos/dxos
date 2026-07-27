# plugin-terra Phase 2 — Objects & Simulation

Date: 2026-07-26
Status: Approved (design). Execution follows Phase 1 completion.
Raw requirements capture: `2026-07-26-plugin-terra-phase2-objects-notes.md`.
Phase 1 spec: `2026-07-26-plugin-terra-design.md`.

## Overview

Phase 2 adds **movable objects** and a **simple game engine** to the Phase 1
planet: boats (sea), planes (air), satellites (space), tanks (ground), and
rockets (ground→space), each built from simple primitives, moving on the sphere
per frame. The globe/terrain remains one reusable module; objects are a second
module layered on top.

## Key decisions (from brainstorming)

- **Object state (hybrid):** object DEFINITIONS are ECHO objects (persistent,
  replicated); positions/velocities are ephemeral local state computed by each
  client's game loop.
- **Pathfinding:** coarse A* over a cubed-sphere passability grid sampled from
  the Phase 1 elevation sampler; per-domain passability; waypoints smoothed.
- **Scope (milestone 1):** all 5 object types, 2 each, + game engine. Effects
  (explosions/exhaust/trails), sun light, submarines, landing-site entities, MCP
  server → Phase 3 backlog.
- **Placement:** same plugin, new modules — `src/sim/` (pure) and `src/scene/`
  (Babylon). `src/engine/` stays pure terrain. Extract to packages only when a
  second consumer appears.
- **Motion architecture:** data-driven motion controllers over plain data
  records (`routed | orbit | ballistic`), not class-per-type, not ECS. Sim core
  is a pure `evaluate(state, definition, { config, elapsed }) → state` — state is
  **evaluated at an absolute time, never accumulated per frame** (see the
  determinism contract below for why a `dt`-stepped core was rejected).

## Determinism contract (first-class invariant)

Every ephemeral value is a pure function of
**`(Terra.config, TerraObject definitions, wall-clock time)`**, so any peer
opening the same `Terra` ECHO object reconstructs the same world sim mid-flight:

- Terrain, nav-grid, biomes derive from `Terra.config.seed` (Phase 1 already
  guarantees this).
- **No frame-rate-dependent integration.** _(Revised 2026-07-27 after review: the
  original design integrated routed objects with a per-frame `dt`, which silently
  broke this contract — two peers at different frame cadences accumulate different
  paths. Variable-`dt` integration is now prohibited in `sim/`.)_
- **Every object's state is closed-form in absolute time**, evaluated rather than
  accumulated:
  - **orbit** (satellite) — circular orbit from `orbit` params + elapsed time.
  - **ballistic** (rocket) — slerp source→target by flight fraction.
  - **routed** (boat, tank, plane) — position is the point at arc length
    `speed × (t − windowStart)` along the current route polyline. Walking a
    polyline by distance is a pure function of `(waypoints, speed, elapsed)`,
    so it needs no accumulator.
- **Replan windows make routing a deterministic recurrence.** Window `n` spans
  `[spawnedAt + n·replanInterval, spawnedAt + (n+1)·replanInterval)`. The route
  for window `n` is a pure function of `(navGrid, positionAtWindowStart, target)`,
  and `positionAtWindowStart` is itself pure by induction from `spawnedAt`. A peer
  joining late reproduces state by evaluating windows in order — a bounded
  recurrence (one route plan per 20 s of world time), not a per-frame replay.
- **Bearing never feeds back into position.** Turn-rate smoothing is applied to
  _orientation only_, downstream of the position calculation, so a peer that
  renders at a different cadence sees the same positions even if the visual
  heading eases slightly differently.
- No `Math.random()` / `Date.now()` inside `sim/` — time is always a parameter;
  any randomness is seeded from ECHO data.
- **Catch-up is bounded.** Evaluating windows is capped (see `MAX_CATCHUP_WINDOWS`);
  beyond the cap the engine snaps to the latest window start, trading exact replay
  for not hanging after a long-backgrounded tab. This is the one documented place
  where two peers can differ, and they re-converge at the next replan boundary.

## Module layout (within plugin-terra)

```
src/engine/     # Phase 1: pure terrain (unchanged, reusable)
src/sim/        # NEW: pure, Babylon-free simulation
  geo.ts        # lat/lng/height <-> Vec3, bearings, great-circle math,
                # 2D->3D velocity mapping on the sphere
  nav-grid.ts   # coarse cubed-sphere passability grid from engine elevation
  route.ts      # A* over nav-grid per domain -> smoothed waypoint list
  motion.ts     # controllers: routed | orbit | ballistic (all closed-form)
  engine.ts     # SimEngine: absolute-time evaluation + replan-window recurrence
  index.ts
src/scene/      # NEW: Babylon object visuals (impure)
  object-forms.ts  # primitive-built low-poly form per type
  object-layer.ts  # sim objects -> Babylon instances; per-frame transforms
  index.ts
```

`engine/scene-manager.ts` (Phase 1) gains a hook to attach the object layer to
its scene and render loop.

## Data model

New ECHO type `TerraObject` (DXN `org.dxos.type.terra.object` v0.1.0), children
of `Terra` via a `Ref` array `terra.objects`:

- `type: 'boat' | 'plane' | 'satellite' | 'tank' | 'rocket'`
- `name?: string`
- `speed: number` (surface-distance units per sim-second)
- `heading?: number` (initial 2D bearing, degrees; for free-moving objects)
- `source?: GeoPoint`, `target?: GeoPoint` where
  `GeoPoint = { lat: number; lng: number; height: number }` — routed types
  (boat, plane, tank, rocket)
- `orbit?: { altitude: number; inclination: number; phase: number; period: number }`
  — satellites
- `spawnedAt: number` (epoch ms) — deterministic clock origin for this object

Positions and velocities are **never persisted**.

`Terra.make()` seeds the demo world with **2 of each type**: boats sea→sea,
tanks land→land, planes crossing continents, rockets launch-site→landing-point,
satellites on 2 different orbits. Seed placement is derived from the terrain
(e.g. sampled water/land points) so it is valid for any world seed.

## Simulation model

**Runtime state per object (local only, all derived — never accumulated):**
`position: Vec3`, `radius`, `bearing`, `route: Vec3[]`, `windowIndex`,
`phase` (rockets: `boost | cruise | descent`).

**2D→3D mapping (`geo.ts`):** a heading is a bearing in the local tangent plane
(0° = north, 90° = east); moving along that bearing follows the great circle, and
the result is re-projected to the domain's radius (sea level / terrain height /
cruise altitude / orbit radius). This realizes "plane on heading NW at a given
velocity" — but the _evaluated_ form below is what determines position.

**Motion controllers (`motion.ts`) — all closed-form in absolute time:**

- `routed` (boat, tank, plane): position is the point at arc length
  `speed × (t − windowStart)` along the current route polyline, walked with
  great-circle segment lengths; radius is sea level (boat), terrain height
  (tank), or cruise altitude (plane). Bearing is the polyline tangent at that
  point. No per-frame accumulation, so frame cadence cannot change the path.
- `orbit` (satellite): closed-form circular orbit from `orbit` params + elapsed
  time.
- `ballistic` (rocket): slerp source→target by flight fraction with a sine
  altitude bump; `boost`/`cruise`/`descent` phases derived from that fraction.

Turn-rate smoothing, if used, applies to the rendered orientation only and must
not feed back into position.

**Course plotting (`route.ts`):** A* over the nav-grid. Passability by domain:

- boat: cell elevation < `waterLevel` (water only);
- tank: land cells with slope below a limit;
- plane: obstacle only where cell elevation exceeds cruise altitude (mountain
  ranges).

Waypoints are cell centers, smoothed (skip-ahead line-of-sight pass). Objects
with source+target **replan periodically** on the deterministic schedule above.

**Nav grid (`nav-grid.ts`):** reuses Phase 1 `makeSampler` + `classify` at low
resolution (6 faces × 32×32 cells) — deterministic from the same seed; built
once per config and shared by all objects.

**SimEngine (`engine.ts`):** `tick(now)` computes `dt`, advances every object
via its controller, and triggers due replans. Pure core; the Babylon render loop
drives it (`scene.onBeforeRenderObservable`). No Babylon imports in `sim/`.

## Rendering

- **`object-forms.ts`:** one merged low-poly mesh per type, from primitives, per
  the requirement's example (plane = cylinder + nose cone + 2× wing rectangles +
  tail). rocket = cylinder + nose cone + fins; boat = hull box + cabin;
  tank = box + turret + barrel; satellite = box body + 2 panel rectangles.
  `convertToFlatShadedMesh`, matte NPR materials (Phase 1 style). One base mesh
  per type; one instance per object. Scale planet-relative (~0.05×R), like
  Phase 1 scatter.
- **`object-layer.ts`:** creates instances from ECHO definitions, updates each
  frame from sim state: position on/above the sphere, orientation with forward =
  velocity direction and up = surface normal (satellites: orbit tangent).
- Optional debug polyline of the active route per object (dev toggle, default
  off).

## Testing

Vitest on `sim/` (pure):

- `geo`: lat/lng↔Vec3 round-trips; bearing math; great-circle advance.
- `nav-grid`: passability agrees with `classify` for sampled cells.
- `route`: A* finds a water-only route around a known peninsula on a fixed seed;
  smoothed path contains no impassable cell.
- `motion`: orbit closed-form determinism; rocket phase transitions at derived
  times; surface controller reaches target within tolerance.
- `engine`: same defs + same clock sequence → identical positions (determinism
  contract); replans occur at `spawnedAt + n · interval`.

Storybook: `TerraArticle` story with the seeded demo world (2×5 objects)
animating over the planet.

## Smoke trails (added 2026-07-27, user directive)

Ships and planes leave **chains of small translucent white spheres that trail and
fade** behind them. Rockets reuse the same mechanism for exhaust.

### Model

A trail is **ephemeral local render state**, never persisted and never in ECHO —
it is derived from an object's position history, which is itself deterministic,
so peers see equivalent trails without replicating anything.

`sim/trail.ts` (pure) keeps a fixed-capacity ring buffer of puffs per emitting
object:

- `type Puff = { position: Vec3; bornAt: number }` — world position (not unit),
  captured at emission.
- `type Trail = { puffs: Puff[]; head: number; lastEmitAt: Vec3 | undefined }`
- `emit(trail, position, nowMs, spacing): Trail` — appends a puff only once the
  object has travelled `spacing` from the previous emission point, so puff
  spacing is speed-independent (a fast plane doesn't produce a denser trail than
  a slow boat, it produces a longer one).
- `activePuffs(trail, nowMs, lifetimeMs): { position: Vec3; age: number }[]` —
  puffs younger than `lifetimeMs`, with `age` normalized to `[0, 1]`.

Puffs are emitted **behind** the object (offset opposite its velocity direction)
and slightly above the surface for ships, so the chain reads as a wake rather
than as spheres intersecting the hull.

### Rendering (`scene/trail-layer.ts`)

One small low-poly sphere base mesh, matte white, alpha-blended, `isVisible =
false`, drawn as **thin instances** — one instance per live puff across all
objects.

Fade combines two effects driven by `age`:

- **Growth:** scale interpolates from a small radius to roughly 2.5× as the puff
  ages, so smoke visibly expands.
- **Alpha:** opacity falls from a low starting value (~0.35) to zero.

Per-instance alpha is the one real technical risk: Babylon thin instances share a
material. Preferred implementation is a per-instance colour buffer
(`thinInstanceSetBuffer('color', buffer, 4)`, with the material configured to
consume instance colour) so each puff fades independently. **Verify that path
works before relying on it**; the documented fallback is scale-only fade (puffs
shrink to nothing at end of life) at a constant low material alpha, which reads
acceptably because overlapping translucent spheres already build density.

Depth: the material writes no depth (`needDepthPrePass = false`,
`disableDepthWrite`-equivalent) so overlapping puffs blend instead of z-fighting;
they are rendered after the planet.

### Configuration

Per-kind defaults, not ECHO fields (this is a visual affordance, not world data):
boats and planes emit by default, rockets emit denser/shorter-lived exhaust,
tanks and satellites emit nothing. A single `TRAIL_SPECS: Record<Kind, TrailSpec
| undefined>` table holds `spacing`, `lifetimeMs`, `capacity`, `startRadius`,
`endScale`, and `startAlpha`.

### Budget

Capacity is capped per object (~40 puffs), so ten objects yield a few hundred
instances — negligible next to the terrain's millions of triangles. The ring
buffer means emission never allocates after warm-up.

### Testing

`sim/trail.ts` is pure and unit-tested: emission respects `spacing` (no puff
until the object has moved far enough), the ring buffer never exceeds capacity
and overwrites oldest-first, `activePuffs` drops expired puffs and reports
monotonically increasing age, and the same position sequence yields the same
puffs. The visual result is verified in the storybook.

## Phasing (Phase 2 tasks; execution follows Phase 1 Tasks 6–13)

- **P2.1** `geo.ts` (+tests)
- **P2.2** `nav-grid.ts` (+tests)
- **P2.3** `route.ts` A* + smoothing (+tests)
- **P2.4** `motion.ts` controllers (+tests)
- **P2.5** `engine.ts` SimEngine (+determinism tests)
- **P2.6** `TerraObject` ECHO type + demo-world seeding in `Terra.make()`
- **P2.7** `object-forms.ts` (Babylon primitives per type)
- **P2.8** `object-layer.ts` + scene-manager hook + animated story
- **P2.9** `trail.ts` (+tests) + `trail-layer.ts` — smoke trails for ships/planes/rockets

## Out of scope (Phase 3 backlog)

- Explosions and other one-shot effects (the continuous smoke/exhaust/vapor
  trails are now in scope as P2.9).
- Sun light source; day/night.
- Submarines as another object type (underwater variant of sea objects —
  submerged depth, hidden-from-surface behavior).
- Landing-site entities for rockets.
- MCP server for the game world.
- Instructions that guide an AI for military strategy (AI-driven command of
  objects via natural-language strategy instructions).
- Standalone iOS app (the globe + sim outside Composer).
- Zoom-dependent terrain resolution (regenerate/LOD by camera distance —
  relates to the Phase 1 per-face quadtree LOD future item).
- Clouds (stylized, Katamari-like puffs above the terrain).
- Smooth/blur polygons (soften the faceted look — smoothing pass or normal
  blending as an alternative rendering style).
- Trains as another ground object type (rail-bound routes).
- Use versor-style rotation from `react-ui-geo` (quaternion drag rotation of the
  globe, as in the d3/versor idiom) instead of/alongside ArcRotateCamera orbit.
