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

---

## Backlog (Phase 3+)

Tracked in the Phase 2 spec; summarized here.

- Effects: explosions, exhaust, smoke, vapor trails (spheres).
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
