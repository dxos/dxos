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
  records (`surface | altitude | orbit | ballistic`), not class-per-type, not
  ECS. Sim core is a pure `step(ctx, object, dt) → object`.

## Determinism contract (first-class invariant)

Every ephemeral value is a pure function of
**`(Terra.config, TerraObject definitions, wall-clock time)`**, so any peer
opening the same `Terra` ECHO object reconstructs the same world sim mid-flight:

- Terrain, nav-grid, biomes derive from `Terra.config.seed` (Phase 1 already
  guarantees this).
- Object runtime state is closed-form (orbits) or integrated (routed types) from
  ECHO definitions + the object's `spawnedAt` epoch.
- **Replan times are deterministic too**: scheduled at
  `spawnedAt + n · replanInterval`, never from a local timer start, so peers
  replan identical routes at identical sim-times.
- No `Math.random()` / `Date.now()` inside `sim/` step logic — time is always a
  parameter; any randomness is seeded from ECHO data.

## Module layout (within plugin-terra)

```
src/engine/     # Phase 1: pure terrain (unchanged, reusable)
src/sim/        # NEW: pure, Babylon-free simulation
  geo.ts        # lat/lng/height <-> Vec3, bearings, great-circle math,
                # 2D->3D velocity mapping on the sphere
  nav-grid.ts   # coarse cubed-sphere passability grid from engine elevation
  route.ts      # A* over nav-grid per domain -> smoothed waypoint list
  motion.ts     # controllers: surface | altitude | orbit | ballistic
  engine.ts     # SimEngine: clock, replan scheduling, per-tick stepping
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

**Runtime state per object (local only):** `position: Vec3`,
`velocity2d: { bearing, speed }`, `altitude`, `waypoints: Vec3[]`,
`waypointIndex`, `phase` (rockets: `boost | cruise | descent`).

**2D→3D velocity mapping (`geo.ts`):** velocity is bearing+speed in the local
tangent plane; each tick the object advances along the great circle in that
bearing and is re-projected to its domain's radius (sea level / cruise altitude
/ orbit radius / terrain height). This realizes "plane on heading NW at a given
velocity".

**Motion controllers (`motion.ts`):**

- `surface` (boat, tank): follow waypoints at sea level (boat) or terrain height
  (tank); bearing turns toward the next waypoint bounded by a max turn rate.
- `altitude` (plane): as `surface` at cruise altitude; climbs after source,
  descends near target.
- `orbit` (satellite): closed-form circular orbit from `orbit` params + elapsed
  time — exactly deterministic, no integration.
- `ballistic` (rocket): three phases — vertical `boost` from source, `cruise`
  arc toward target (slerp with altitude bump), `descent`; phase timing derived
  from distance and `speed`.

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

## Phasing (Phase 2 tasks; execution follows Phase 1 Tasks 6–13)

- **P2.1** `geo.ts` (+tests)
- **P2.2** `nav-grid.ts` (+tests)
- **P2.3** `route.ts` A* + smoothing (+tests)
- **P2.4** `motion.ts` controllers (+tests)
- **P2.5** `engine.ts` SimEngine (+determinism tests)
- **P2.6** `TerraObject` ECHO type + demo-world seeding in `Terra.make()`
- **P2.7** `object-forms.ts` (Babylon primitives per type)
- **P2.8** `object-layer.ts` + scene-manager hook + animated story

## Out of scope (Phase 3 backlog)

- Explosions, exhaust, smoke, vapor trails (spheres).
- Sun light source; day/night.
- Submarines as another object type (underwater variant of sea objects —
  submerged depth, hidden-from-surface behavior).
- Landing-site entities for rockets.
- MCP server for the game world.
- Instructions that guide an AI for military strategy (AI-driven command of
  objects via natural-language strategy instructions).
- Standalone iOS app (the globe + sim outside Composer).
