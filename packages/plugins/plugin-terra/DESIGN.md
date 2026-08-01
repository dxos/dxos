# plugin-terra — Design

A Composer plugin that renders a deterministic, stylized 3D planet with
Babylon.js, and (Phase 2) simulates movable objects over it.

- **Phase 1 spec:** [`agents/superpowers/specs/2026-07-26-plugin-terra-design.md`](../../../agents/superpowers/specs/2026-07-26-plugin-terra-design.md)
- **Phase 1 plan:** [`agents/superpowers/plans/2026-07-26-plugin-terra.md`](../../../agents/superpowers/plans/2026-07-26-plugin-terra.md)
- **Phase 2 spec:** [`agents/superpowers/specs/2026-07-26-plugin-terra-phase2-objects-design.md`](../../../agents/superpowers/specs/2026-07-26-plugin-terra-phase2-objects-design.md)
- **Phase 2 plan:** [`agents/superpowers/plans/2026-07-27-plugin-terra-phase2-objects.md`](../../../agents/superpowers/plans/2026-07-27-plugin-terra-phase2-objects.md)
- **Validated spike (reference code):** [`agents/superpowers/specs/2026-07-26-plugin-terra-spike/`](../../../agents/superpowers/specs/2026-07-26-plugin-terra-spike/)

## Phase 1 — Deterministic planet

### What it delivers

A `Terra` ECHO object holds world metadata; a `TerraArticle` surface renders it.
Seed-driven cubed-sphere terrain, a configurable water level, flat-shaded biomes
(beach / grass / forest / rock, snow, opt-in polar caps), and instanced scatter
of trees and rocks. Orbiting mini-planet camera, designed so a surface camera can
be added later.

### Style

Non-photorealistic but semi-realistic: flat/faceted shading (per-face normals),
**no shadows**, matte materials (`specularColor` black), two hemispheric lights
(key + fill). Fog is a documented hook for later.

### Architecture

```text
src/engine/           pure, deterministic, unit-tested (except scene-*)
  noise.ts            seeded fBm + ridged mountains -> elevation/moisture
  cubed-sphere.ts     6 face bases + unit-sphere mapping + vector helpers
  terrain.ts          radiusAt / seaRadius / latitude (landGain displacement)
  biomes.ts           classify(elevation, latitude, moisture)
  palette.ts          biome colors + depth-shaded ocean
  generate-planet.ts  triangle-soup mesh + scatter placements
  scene-manager.ts    IMPURE: Babylon engine/scene/camera/lights/meshes
  scene-fps.ts        IMPURE: in-scene FPS readout (@babylonjs/gui)
src/types/Terra.ts    ECHO object + TerraConfig schema + defaults
src/containers/       TerraArticle (canvas host + debounced regeneration)
src/components/       TerraForm (react-ui-form config panel)
src/capabilities/     create-object, react-surface
```

`engine/*` is Babylon-free apart from `scene-*.ts`, so generation is unit-tested
without a renderer.

### Key decisions

| Decision                                             | Rationale                                                                                                                                                                                                                        |
| ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Cubed-sphere** (not icosphere)                     | Each face is a grid that splits into a quadtree — the cleanest path to future surface-camera LOD.                                                                                                                                |
| **3D noise sampling**                                | Sampling fBm at the 3D unit position is seamless over the whole sphere; no UV seam.                                                                                                                                              |
| **Compose primitives, don't adopt a planet library** | No maintained Babylon planet library exists (the mature ones are Three.js demos). Uses `simplex-noise` + `seedrandom` + Babylon built-ins; the cubed-sphere and biome layers are ours.                                           |
| **Depth-shaded opaque ocean**                        | A translucent water sphere tints emergent land at grazing angles and leaks the far hemisphere. Baking shallow→deep colour into the opaque terrain reads as water with zero land tint. A literal sheen is opt-in, off by default. |
| **Reversed triangle winding**                        | Babylon is left-handed; a right-handed generator emits back-facing triangles and culling removes the near hemisphere.                                                                                                            |
| **`landGain`**                                       | Without amplifying relief above the waterline, land reads as submerged.                                                                                                                                                          |
| **Mountain mask × ridged noise**                     | Plain fBm scatters peaks; a low-frequency belt mask plus ridged detail clumps them into ranges.                                                                                                                                  |
| **No elevation clamp**                               | Clamping to 1 flattens tall peaks into plateaus.                                                                                                                                                                                 |
| **Polar caps opt-in** (`poles`, default off)         | Latitude ice caps look artificial on many worlds; mountain snow is always on.                                                                                                                                                    |
| **In-React config panel**                            | Superseded an in-scene `@babylonjs/gui` panel: `TerraForm` uses `react-ui-form` with a new `Slider` primitive contributed to `@dxos/react-ui`. The FPS readout stays in-scene.                                                   |

### Spike findings (validated before implementation)

Determinism, seamless cube-face edges (verified in wireframe), 60 fps at 512²/face
(≈3.1M triangles), thin-instance scatter, and the winding/water/landGain issues
above. Reference code is checked in under the spike directory.

### Performance

One static mesh is fine for the orbit view up to ~512²/face. A future surface
camera needs per-face quadtree LOD, not a bigger single mesh.

## Phase 2 — Objects & simulation

### What it delivers

Movable objects over the Phase 1 planet — boats (sea), planes (air), satellites
(space), tanks (ground), rockets (ground→space) — each built from simple
primitives, two of each kind, advanced every frame by a small game engine.

### Architecture

```text
src/sim/                  pure, Babylon-free, unit-tested
  geo.ts                  GeoPoint <-> Vec3, tangent frame, bearing, great-circle advance
  nav-grid.ts             coarse cubed-sphere cells + cross-face neighbors + passability
  route.ts                A* over the grid + line-of-sight smoothing
  motion.ts               surface | altitude | orbit | ballistic controllers
  engine.ts               SimEngine: clock, arrival-driven leg recurrence, per-tick step
src/scene/                Babylon visuals for objects
  object-forms.ts         one merged low-poly mesh per kind
  object-layer.ts         sim state -> thin instances, per-frame transforms
src/types/TerraObject.ts  ECHO definition (kind, speed, source/target, orbit, spawnedAt)
```

### Key decisions

| Decision                                    | Rationale                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Hybrid state**                            | Object _definitions_ are ECHO objects (persistent, replicated); positions/velocities are ephemeral local state recomputed by each client. Replicating per-frame positions would be pointless traffic.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| **Determinism contract**                    | Every runtime value is a pure function of `(Terra.config, TerraObject definitions, elapsed time)`, so any peer opening the same world reconstructs the same simulation mid-flight. No `Math.random()`/`Date.now()` in `sim/`; a routed object's re-targeting seed is `(config.seed, definition.id, leg)`, never a local timer start.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| **Data-driven controllers**                 | Four motion models over plain records, not class-per-type and not an ECS — the object count is small and the models are few.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| **All motion closed-form in absolute time** | Position is _evaluated_ from elapsed time, never accumulated per frame. Revised 2026-07-27 after PR review caught that variable-`dt` integration of routed objects silently broke the peer-determinism claim (two clients at different frame cadences accumulate different paths). Routed objects walk their route polyline by arc length. Revised again 2026-07-27 (later the same day) to replace the original fixed 20s replan-window recurrence with **arrival-driven, variable-length legs**: on reaching a leg's destination the object immediately re-targets and keeps moving, rather than sitting idle until the next window boundary — leg `n`'s duration is its own route length over `speed`, so `sim/engine.ts` walks the leg recurrence forward (bounded by `MAX_CATCHUP_LEGS`, the same catch-up-cap idea as before) instead of a fixed-interval one. |
| **A\* over a coarse grid**                  | 24 cells/face is enough to route around continents; cross-face adjacency is stitched by nearest-edge-cell search rather than hand-coded cube-edge maps.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| **Same plugin, new modules**                | `sim/` and `scene/` live in plugin-terra until a second consumer justifies extraction.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |

### Motion models

- **routed** (boat, tank, plane): position is the point at arc length `speed × (t − legStart)` along the current leg's route polyline; on arrival, `legStart` advances by that leg's own duration and a fresh destination is picked, so legs are variable-length, not fixed-interval; radius is sea level, terrain height, or cruise altitude by kind.
- **orbit** (satellite): closed-form circular orbit from `altitude`/`inclination`/`phase`/`period`.
- **ballistic** (rocket): slerp source→target with a sine altitude bump; `boost`/`cruise`/`descent` phases derived from flight fraction.

### Passability

- boat → cells below `waterLevel`; tank → land cells below the rock line; plane → anything below cruise elevation.

### Performance

`evaluate` is called far more often than once per object per frame: `sim/trail.ts`
re-evaluates every live smoke puff's birth instant on every frame, so the real
rate is objects × puffs (~500/frame at 20 objects). Anything `evaluate` touches is
therefore on the hot path — `makeSampler` in particular, which seeds four simplex
permutation tables and is now memoized in `engine/noise.ts`. Keep per-call
allocation out of `evaluate` and its callees; measure with a frame-loop probe
rather than by reasoning about it, since the trail multiplier is easy to forget.

### Behaviors

`sim/motion.ts` answers _where_ an object is — the route walk, the orbit, the
ballistic arc. `sim/behaviors.ts` answers _how it flies there_: one behavior per
kind, each returning the object's attitude (its distance from the planet's centre
and its nose pitch) for an instant. A new kind is an entry in that table rather
than another arm of a switch inside the motion controllers, and `ObjectState.pitch`
is what the renderer orients by — for every kind, not just rockets.

The plane's behavior is terrain-following. It samples the terrain across a window
that runs both ahead of and behind it, and treats a peak `gap` away as demanding
`clearance - maxClimb * gap` rather than its full clearance immediately: the plane
has that much arc left in which to climb. The highest such demand across the window
is the altitude, which therefore rises into a mountain at the climb limit, tops out
over it, and settles back to cruise at that same limit once it is behind — no dive
at a ridge, no fall out of the sky past one. The pitch is that profile's own slope,
measured across a baseline either side rather than at a point, so the nose eases
through a summit instead of flipping from climb to descent in one frame.

Two things this deliberately does not do: it does not re-route around terrain (the
nav grid still lets air routes cross anything — see the backlog), and it cannot
answer terrain steeper than a full-rate climb over the lookahead can reach.

The rocket's behavior sets its nose to its own flight-path angle — the climb rate
of the ballistic profile over the speed it covers the arc at. An angle scripted
independently of the trajectory (a cosine from +90° to -90°, as it was first
written) is far steeper than a lofted arc really flies, and the rocket visibly
skids: pointing up while travelling forward. Because the exhaust also trails along
`state.pitch`, an angle that disagrees with the path takes the plume with it.

Cost: the behavior is the plane's whole per-evaluation expense, and `evaluate` runs
hundreds of times a frame under the trail sampler. The window is therefore walked
with `walkRouteSeries` (one pass over the polyline for all the samples, rather than
`walkRoute` rescanning it per sample), which took the demo world from 3.05ms to
1.90ms per frame at that rate.

### Destruction and effects

A rocket is destroyed where it lands, and the blast that replaces it is derived
the same way everything else in `sim/` is: the impact instant is the arc over the
speed, so `state.explosion` follows from `elapsed` alone. There is no landing
event to catch and no per-frame state to keep, which is what lets a peer joining
late — or a view scrubbed to an arbitrary instant — see the same blast at the
same stage. `scene/explosion-layer.ts` draws it as concentric shells with
_additive_ blending; alpha-blended, each shell veils the one inside it and three
of them over a night sky read as muddy brown rather than as light.

Exhaust is per-kind (`TrailSpec.color`) because a wake and a plume are not the
same thing — spray behind a hull, flame behind a nozzle. The plume is gated on
the boost phase, so it stops when the engine does rather than smearing over the
whole arc, and it is offset along the pitched flight axis: offset along the
ground track alone (as it first was) hangs a near-vertical launch's whole plume
beside the arc instead of under it.

### Views

`TerraArticle` shows one of three views, chosen by tabs: the orbiting 3D planet,
the 2D map from above, and a chase camera riding a selected object. The 3D canvas
is never unmounted — the Babylon render loop is what advances the simulation, and
the map renders from React state sampled inside that loop — so the map hides it
with `invisible` rather than `display: none`, which would also collapse the
canvas to 0x0. One `selectedId` serves the map's highlight, the telemetry row,
and the camera's target.

A course change (a new destination, a waypoint) is steered into, never snapped
to: both renderers ease their drawn heading toward `state.bearing` at the kind's
own turn rate (`scene/heading.ts`). This is rendering-only — it never feeds back
into `sim/`, so peers rendering at different cadences still agree on position.

Changing one object's destination re-derives only that object
(`SimEngine.respawn`). Rebuilding the engine would re-spawn every object from
leg 0, which is not neutral: anything more than `MAX_CATCHUP_LEGS` into its
sequence snaps to a fresh leg.

### Planet cache

Generation is deterministic in `TerraConfigValues` and costs 1.3s at the default
resolution of 256 (5s at 512), while the article remounts on any resize, on
opening a companion, and on navigation — each of which used to regenerate. The
planet is therefore cached by a stable key over those values (`engine/planet-cache.ts`)
in a plugin capability (`TerraCapabilities.PlanetCache`), which outlives every
surface; rendered outside a plugin manager (stories, tests) the mount owns a
private cache instead. A cache hit also skips the regeneration debounce, since
there is nothing to coalesce.

Retention is bounded by bytes, not entries: one mesh is 94MB at resolution 256
and 377MB at 512, so an entry-count cap would be a memory cliff. The budget
evicts least-recently-used planets but always keeps the newest, which may exceed
it on its own. `SceneManager.render` additionally no-ops when handed the planet
it already drew, so a config-identity change that resolves to the same planet
does not dispose and rebuild identical meshes (~350ms).

---

## Backlog (Phase 3+)

Tracked in the Phase 2 spec; summarized here.

- Effects: smoke and vapor trails beyond the wakes/plumes already shipped
  (explosions and exhaust are done — see "Destruction and effects").
- Surface (flyover/walk) camera with per-face quadtree LOD and chunk streaming.
- Zoom-dependent terrain resolution.
- Sun/directional light; day–night.
- Clouds (stylized, Katamari-like); smooth/blur polygons as an alternate style.
- Fog; rivers as flow lines; fields as ground-texture variation.
- More object kinds: submarines, trains.
- Rocket landing sites as first-class entities.
- Versor-style quaternion drag rotation (from `react-ui-geo`).
- AI-guided military strategy instructions.
- MCP server exposing the game world.
- Standalone iOS app.
