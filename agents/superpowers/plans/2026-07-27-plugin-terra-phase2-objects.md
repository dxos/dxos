# plugin-terra Phase 2 — Objects & Simulation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add movable objects (boats, planes, satellites, tanks, rockets) and a per-frame game engine to the Phase 1 planet, driven by `TerraObject` ECHO definitions so every peer reconstructs the same simulation.

**Architecture:** A pure, Babylon-free `src/sim/` module (spherical geometry → nav grid → A* routing → motion controllers → `SimEngine`) consumed by an impure `src/scene/` module that builds low-poly Babylon meshes and updates thin instances each frame. `src/engine/` (Phase 1 terrain) is unchanged and reused as the terrain oracle.

**Tech Stack:** TypeScript, Effect Schema, Babylon.js (`@babylonjs/core`), Vitest, Storybook, moon.

**Spec:** `agents/superpowers/specs/2026-07-26-plugin-terra-phase2-objects-design.md`. Phase 1 plan: `agents/superpowers/plans/2026-07-26-plugin-terra.md`.

## Global Constraints

- **Branch safety:** never edit on `main`; work only in the assigned worktree.
- **`src/sim/` MUST NOT import Babylon** (`@babylonjs/core`, `@babylonjs/gui`) — it is pure and unit-tested. Only `src/scene/` and `src/engine/scene-*.ts` touch Babylon.
- **Determinism contract (load-bearing):** every runtime value is a pure function of `(Terra.config, TerraObject definitions, elapsed time)`. **No `Math.random()`, no `Date.now()`, no `new Date()` inside `src/sim/`** — time is always a parameter; any randomness derives from ECHO data via `seedrandom`. Replans are scheduled at `spawnedAt + n · replanInterval`, never from a local timer start.
- **No casts to silence the type-checker** (`as any`, `as unknown as T`, non-null `!`); `as const` is fine.
- **Copyright header** `//\n// Copyright 2026 DXOS.org\n//` at the top of every new source file. Comments state _why_ in one clause, ending with a period. JSDoc public functions.
- **TypeScript, single quotes, named exports, arrow functions.** Import order: builtin → external → @dxos → internal (`#...`) → parent → sibling, blank line between groups.
- **Prefer ES `#private`** over the `private` keyword. No single-letter variable names.
- **Angles:** latitude/longitude/bearing are **degrees** in all public APIs; radians only inside function bodies. Bearing is 0° = north, 90° = east.
- **Sphere convention (matches Phase 1):** y-up. `latitude(unit) = Math.abs(unit[1])` already exists in `engine/terrain.ts`; north pole is `[0, 1, 0]`.
- **Format before every commit:** `pnpm format` (oxfmt) and stage the result.
- **Commands:** the PATH `moon` cannot parse this workspace — always use the proto shim `/Users/burdon/.proto/shims/moon`. Test one file: `/Users/burdon/.proto/shims/moon run plugin-terra:test -- src/sim/<file>.test.ts`.

---

## Existing interfaces this plan builds on (verified, do not re-derive)

From `packages/plugins/plugin-terra/src/engine/` (all re-exported by `engine/index.ts`):

```ts
// noise.ts
type Vec3 = readonly [number, number, number];
type NoiseConfig = {
  seed: string;
  frequency: number;
  octaves: number;
  persistence: number;
  lacunarity: number;
  continentPower: number;
  waterLevel: number;
  mountainScale: number;
  maskFrequency: number;
  maskThreshold: number;
};
const makeSampler: (config: NoiseConfig) => { elevation(unit: Vec3): number; moisture(unit: Vec3): number };

// cubed-sphere.ts
const FACE_UPS: Vec3[]; // 6 faces
const normalize: (v: Vec3) => Vec3;
const add: (a: Vec3, b: Vec3) => Vec3;
const sub: (a: Vec3, b: Vec3) => Vec3;
const cross: (a: Vec3, b: Vec3) => Vec3;
const dot: (a: Vec3, b: Vec3) => number;
const scale: (a: Vec3, s: number) => Vec3;
const faceBasis: (up: Vec3) => { axisA: Vec3; axisB: Vec3 };
const unitOnFace: (up: Vec3, axisA: Vec3, axisB: Vec3, i: number, j: number, resolution: number) => Vec3;

// terrain.ts
type TerrainConfig = {
  radius: number;
  elevationScale: number;
  waterLevel: number;
  landGain: number;
  oceanDepthBias: number;
};
const seaRadius: (config: TerrainConfig) => number;
const radiusAt: (config: TerrainConfig, elevation: number) => number;
const latitude: (unit: Vec3) => number;

// biomes.ts
type Biome = 'ocean' | 'beach' | 'grass' | 'forest' | 'rock' | 'snow';
const classify: (config: ClimateConfig, elevation: number, latitude: number, moisture: number) => Biome;

// generate-planet.ts
type TerraConfigValues = NoiseConfig &
  TerrainConfig &
  ClimateConfig & { resolution: number; treeDensity: number; rockDensity: number; trees: boolean; rocks: boolean };

// scene-manager.ts
class SceneManager {
  constructor(canvas: HTMLCanvasElement);
  get scene(): Scene;
  get engine(): Engine;
  setWaterSheen(enabled: boolean): void;
  render(planet: Planet): void;
  dispose(): void;
}
```

From `src/types/Terra.ts`: `Terra.Terra` (ECHO class), `Terra.TerraConfig`, `Terra.make(props?)`, `Terra.defaultConfig()`, `Terra.toConfigValues(terra): TerraConfigValues`.

---

## File Structure

```
packages/plugins/plugin-terra/src/
  engine/           # Phase 1 terrain — unchanged, reused as the terrain oracle
  sim/              # NEW: pure, Babylon-free
    geo.ts          # GeoPoint <-> Vec3, tangent frame, bearing, great-circle advance
    nav-grid.ts     # coarse cubed-sphere cell grid + neighbors + per-domain passability
    route.ts        # A* over the nav grid + line-of-sight smoothing
    motion.ts       # surface | altitude | orbit | ballistic controllers
    engine.ts       # SimEngine: clock, deterministic replan schedule, per-tick stepping
    index.ts
  scene/            # NEW: Babylon visuals
    object-forms.ts # one low-poly base mesh per object type, built from primitives
    object-layer.ts # sim state -> Babylon thin instances, per-frame transforms
    index.ts
  types/
    TerraObject.ts  # NEW: ECHO object definition
```

`sim/*` is pure and independently testable. `scene/*` owns all Babylon for objects. Neither reaches into the other: `object-layer.ts` consumes sim output as plain data.

---

### Task 1: Spherical geometry (`geo.ts`)

**Files:**

- Create: `packages/plugins/plugin-terra/src/sim/geo.ts`
- Test: `packages/plugins/plugin-terra/src/sim/geo.test.ts`

**Interfaces:**

- Consumes: `Vec3`, `normalize`, `sub`, `cross`, `dot`, `scale`, `add` from `../engine`.
- Produces:
  - `type GeoPoint = { lat: number; lng: number; height: number }` — degrees; `height` is a fraction of planet radius above the sea surface.
  - `toUnit(geo: Pick<GeoPoint, 'lat' | 'lng'>): Vec3`
  - `toGeo(unit: Vec3): { lat: number; lng: number }`
  - `tangentFrame(unit: Vec3): { north: Vec3; east: Vec3 }`
  - `bearingTo(from: Vec3, to: Vec3): number` — initial bearing in degrees, `[0, 360)`.
  - `angleBetween(from: Vec3, to: Vec3): number` — central angle in radians.
  - `advance(unit: Vec3, bearing: number, angularDistance: number): Vec3`
  - `turnToward(current: number, target: number, maxDelta: number): number` — bearing interpolation across the 0/360 wrap.

- [ ] **Step 1: Write the failing test.**

```ts
//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { advance, angleBetween, bearingTo, tangentFrame, toGeo, toUnit, turnToward } from './geo';

describe('geo', () => {
  test('toUnit places the poles and the prime meridian', () => {
    expect(toUnit({ lat: 90, lng: 0 })[1]).toBeCloseTo(1, 9);
    expect(toUnit({ lat: -90, lng: 0 })[1]).toBeCloseTo(-1, 9);
    const equator = toUnit({ lat: 0, lng: 0 });
    expect(equator[2]).toBeCloseTo(1, 9); // Prime meridian faces +z.
  });

  test('toGeo round-trips toUnit', () => {
    for (const point of [
      { lat: 12.5, lng: 42 },
      { lat: -33, lng: -120 },
      { lat: 0, lng: 179 },
    ]) {
      const back = toGeo(toUnit(point));
      expect(back.lat).toBeCloseTo(point.lat, 6);
      expect(back.lng).toBeCloseTo(point.lng, 6);
    }
  });

  test('tangent frame is orthonormal and points north', () => {
    const unit = toUnit({ lat: 20, lng: 55 });
    const { north, east } = tangentFrame(unit);
    expect(north[0] * unit[0] + north[1] * unit[1] + north[2] * unit[2]).toBeCloseTo(0, 9);
    expect(east[0] * unit[0] + east[1] * unit[1] + east[2] * unit[2]).toBeCloseTo(0, 9);
    expect(north[0] * east[0] + north[1] * east[1] + north[2] * east[2]).toBeCloseTo(0, 9);
    expect(north[1]).toBeGreaterThan(0); // North has a positive y component off the pole.
  });

  test('bearingTo reports cardinal directions', () => {
    const origin = toUnit({ lat: 0, lng: 0 });
    expect(bearingTo(origin, toUnit({ lat: 10, lng: 0 }))).toBeCloseTo(0, 4);
    expect(bearingTo(origin, toUnit({ lat: 0, lng: 10 }))).toBeCloseTo(90, 4);
    expect(bearingTo(origin, toUnit({ lat: -10, lng: 0 }))).toBeCloseTo(180, 4);
    expect(bearingTo(origin, toUnit({ lat: 0, lng: -10 }))).toBeCloseTo(270, 4);
  });

  test('advance moves along the great circle by the given angle', () => {
    const origin = toUnit({ lat: 0, lng: 0 });
    const moved = advance(origin, 90, Math.PI / 18); // 10 degrees east.
    const geo = toGeo(moved);
    expect(geo.lat).toBeCloseTo(0, 6);
    expect(geo.lng).toBeCloseTo(10, 6);
    expect(angleBetween(origin, moved)).toBeCloseTo(Math.PI / 18, 9);
  });

  test('advance stays on the unit sphere', () => {
    const moved = advance(toUnit({ lat: 45, lng: 30 }), 217, 0.4);
    expect(Math.hypot(moved[0], moved[1], moved[2])).toBeCloseTo(1, 9);
  });

  test('turnToward takes the short way around the wrap', () => {
    expect(turnToward(350, 10, 30)).toBeCloseTo(10, 9); // Crosses 360 forward.
    expect(turnToward(10, 350, 30)).toBeCloseTo(350, 9); // Crosses 0 backward.
    expect(turnToward(0, 90, 30)).toBeCloseTo(30, 9); // Clamped by maxDelta.
    expect(turnToward(0, 270, 30)).toBeCloseTo(330, 9); // Shorter to turn left.
  });
});
```

- [ ] **Step 2: Run to verify it fails.**

Run: `/Users/burdon/.proto/shims/moon run plugin-terra:test -- src/sim/geo.test.ts`
Expected: FAIL (`./geo` not found).

- [ ] **Step 3: Implement `geo.ts`.**

```ts
//
// Copyright 2026 DXOS.org
//

import { type Vec3, add, cross, dot, normalize, scale, sub } from '../engine';

/** A position on the planet; `lat`/`lng` in degrees, `height` as a fraction of radius above sea level. */
export type GeoPoint = { lat: number; lng: number; height: number };

const DEG = Math.PI / 180;
const RAD = 180 / Math.PI;
const POLE: Vec3 = [0, 1, 0];

/** Unit-sphere position for a latitude/longitude, in the y-up frame the terrain uses. */
export const toUnit = ({ lat, lng }: Pick<GeoPoint, 'lat' | 'lng'>): Vec3 => {
  const phi = lat * DEG;
  const theta = lng * DEG;
  const cosPhi = Math.cos(phi);
  return [cosPhi * Math.sin(theta), Math.sin(phi), cosPhi * Math.cos(theta)];
};

/** Inverse of `toUnit`; longitude is normalized to (-180, 180]. */
export const toGeo = (unit: Vec3): { lat: number; lng: number } => ({
  lat: Math.asin(Math.min(1, Math.max(-1, unit[1]))) * RAD,
  lng: Math.atan2(unit[0], unit[2]) * RAD,
});

/**
 * Local north/east tangent basis at a point. Near the poles the pole vector is parallel to the
 * radial, so an arbitrary meridian is chosen to keep the basis defined.
 */
export const tangentFrame = (unit: Vec3): { north: Vec3; east: Vec3 } => {
  const radial = dot(POLE, unit);
  const projected = sub(POLE, scale(unit, radial));
  const magnitude = Math.hypot(projected[0], projected[1], projected[2]);
  const north = magnitude < 1e-9 ? normalize(cross(unit, [1, 0, 0])) : normalize(projected);
  return { north, east: cross(north, unit) };
};

/** Central angle between two unit vectors, in radians. */
export const angleBetween = (from: Vec3, to: Vec3): number => Math.acos(Math.min(1, Math.max(-1, dot(from, to))));

/** Initial great-circle bearing from one point to another, in degrees [0, 360). */
export const bearingTo = (from: Vec3, to: Vec3): number => {
  const { north, east } = tangentFrame(from);
  const tangent = sub(to, scale(from, dot(from, to)));
  const degrees = Math.atan2(dot(tangent, east), dot(tangent, north)) * RAD;
  return (degrees + 360) % 360;
};

/** Moves along the great circle leaving `unit` on `bearing` by `angularDistance` radians. */
export const advance = (unit: Vec3, bearing: number, angularDistance: number): Vec3 => {
  const { north, east } = tangentFrame(unit);
  const radians = bearing * DEG;
  const direction = add(scale(north, Math.cos(radians)), scale(east, Math.sin(radians)));
  return normalize(add(scale(unit, Math.cos(angularDistance)), scale(direction, Math.sin(angularDistance))));
};

/** Rotates a bearing toward a target by at most `maxDelta` degrees, taking the shorter direction. */
export const turnToward = (current: number, target: number, maxDelta: number): number => {
  const delta = ((((target - current) % 360) + 540) % 360) - 180;
  const step = Math.max(-maxDelta, Math.min(maxDelta, delta));
  return (((current + step) % 360) + 360) % 360;
};
```

- [ ] **Step 4: Run to verify it passes.**

Run: `/Users/burdon/.proto/shims/moon run plugin-terra:test -- src/sim/geo.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit.**

```bash
pnpm format
git add packages/plugins/plugin-terra/src/sim
git commit -m "plugin-terra: spherical geometry helpers for the simulation"
```

---

### Task 2: Navigation grid (`nav-grid.ts`)

**Files:**

- Create: `packages/plugins/plugin-terra/src/sim/nav-grid.ts`
- Test: `packages/plugins/plugin-terra/src/sim/nav-grid.test.ts`

**Interfaces:**

- Consumes: `Vec3`, `FACE_UPS`, `faceBasis`, `unitOnFace`, `dot`, `makeSampler`, `TerraConfigValues` from `../engine`; `angleBetween` from `./geo`.
- Produces:
  - `type Domain = 'sea' | 'land' | 'air'`
  - `type NavCell = { index: number; unit: Vec3; elevation: number; neighbors: number[] }`
  - `type NavGrid = { resolution: number; cells: NavCell[]; waterLevel: number; findNearest(unit: Vec3): number }`
  - `buildNavGrid(config: TerraConfigValues, resolution?: number): NavGrid` — default resolution 24 cells per face edge.
  - `isPassable(grid: NavGrid, index: number, domain: Domain, cruiseElevation?: number): boolean`

Passability: `sea` = elevation below `waterLevel`; `land` = elevation at/above `waterLevel` and below the rock line (`waterLevel + 0.35 × (1 - waterLevel)`), which keeps ground units off mountain ranges; `air` = everything below `cruiseElevation` (defaults to `Infinity`, so air is unobstructed unless a peak exceeds cruise height).

- [ ] **Step 1: Write the failing test.**

```ts
//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { Terra } from '../types';
import { angleBetween } from './geo';
import { buildNavGrid, isPassable } from './nav-grid';

const config = Terra.toConfigValues(Terra.make({ config: { seed: 'nav-1' } }));

describe('nav-grid', () => {
  test('covers all six faces at the requested resolution', () => {
    const grid = buildNavGrid(config, 8);
    expect(grid.cells).toHaveLength(6 * 8 * 8);
    expect(grid.cells.every((cell) => Math.abs(Math.hypot(...cell.unit) - 1) < 1e-9)).toBe(true);
  });

  test('is deterministic for a seed', () => {
    const first = buildNavGrid(config, 8);
    const second = buildNavGrid(config, 8);
    expect(first.cells.map((cell) => cell.elevation)).toEqual(second.cells.map((cell) => cell.elevation));
  });

  test('every cell has neighbors and neighbor links are symmetric', () => {
    const grid = buildNavGrid(config, 8);
    expect(grid.cells.every((cell) => cell.neighbors.length >= 4)).toBe(true);
    for (const cell of grid.cells) {
      for (const neighbor of cell.neighbors) {
        expect(grid.cells[neighbor].neighbors).toContain(cell.index);
      }
    }
  });

  test('neighbors are spatially adjacent, so cross-face links do not jump the sphere', () => {
    const grid = buildNavGrid(config, 8);
    // A neighbor is at most ~2 cell widths away; a face-spanning link would be far larger.
    const limit = (2 * Math.PI) / (4 * 8);
    for (const cell of grid.cells) {
      for (const neighbor of cell.neighbors) {
        expect(angleBetween(cell.unit, grid.cells[neighbor].unit)).toBeLessThan(limit * 2);
      }
    }
  });

  test('sea and land passability partition the surface', () => {
    const grid = buildNavGrid(config, 8);
    for (const cell of grid.cells) {
      const sea = isPassable(grid, cell.index, 'sea');
      expect(sea).toBe(cell.elevation < grid.waterLevel);
      if (sea) {
        expect(isPassable(grid, cell.index, 'land')).toBe(false);
      }
    }
  });

  test('air is blocked only by terrain above the cruise elevation', () => {
    const grid = buildNavGrid(config, 8);
    const peak = Math.max(...grid.cells.map((cell) => cell.elevation));
    const peakIndex = grid.cells.findIndex((cell) => cell.elevation === peak);
    expect(isPassable(grid, peakIndex, 'air')).toBe(true);
    expect(isPassable(grid, peakIndex, 'air', peak - 0.01)).toBe(false);
  });

  test('findNearest returns the closest cell to a probe point', () => {
    const grid = buildNavGrid(config, 8);
    const target = grid.cells[100];
    expect(grid.findNearest(target.unit)).toBe(target.index);
  });
});
```

- [ ] **Step 2: Run to verify it fails.**

Run: `/Users/burdon/.proto/shims/moon run plugin-terra:test -- src/sim/nav-grid.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `nav-grid.ts`.**

Cross-face adjacency is the only subtle part: within a face, neighbors are the four index-adjacent cells; for cells on a face edge the missing neighbor lies on another face, and is found by nearest-centre search restricted to the other faces' edge cells (a few hundred candidates, computed once).

```ts
//
// Copyright 2026 DXOS.org
//

import { type TerraConfigValues, type Vec3, FACE_UPS, dot, faceBasis, makeSampler, unitOnFace } from '../engine';

/** Movement medium; each has its own passability rule over the same grid. */
export type Domain = 'sea' | 'land' | 'air';

export type NavCell = {
  index: number;
  unit: Vec3;
  elevation: number;
  neighbors: number[];
};

export type NavGrid = {
  resolution: number;
  waterLevel: number;
  cells: NavCell[];
  findNearest(unit: Vec3): number;
};

const DEFAULT_RESOLUTION = 24;

/** Ground units cannot climb the upper part of the land range; keeps tanks out of mountain ranges. */
const LAND_SLOPE_CEILING = 0.35;

/**
 * Builds a coarse passability grid over the cubed sphere, sampling the same seeded elevation the
 * terrain mesh uses so routes agree with what is rendered.
 */
export const buildNavGrid = (config: TerraConfigValues, resolution: number = DEFAULT_RESOLUTION): NavGrid => {
  const { elevation } = makeSampler(config);
  const cells: NavCell[] = [];

  FACE_UPS.forEach((up, face) => {
    const { axisA, axisB } = faceBasis(up);
    for (let j = 0; j < resolution; j++) {
      for (let i = 0; i < resolution; i++) {
        // Sample cell centres so a cell's elevation represents its interior, not a shared corner.
        const unit = unitOnFace(up, axisA, axisB, i + 0.5, j + 0.5, resolution);
        cells.push({
          index: face * resolution * resolution + j * resolution + i,
          unit,
          elevation: elevation(unit),
          neighbors: [],
        });
      }
    }
  });

  const cellAt = (face: number, i: number, j: number): number => face * resolution * resolution + j * resolution + i;
  const edgeIndices: number[] = [];

  for (let face = 0; face < FACE_UPS.length; face++) {
    for (let j = 0; j < resolution; j++) {
      for (let i = 0; i < resolution; i++) {
        const index = cellAt(face, i, j);
        const neighbors = cells[index].neighbors;
        if (i > 0) {
          neighbors.push(cellAt(face, i - 1, j));
        }
        if (i < resolution - 1) {
          neighbors.push(cellAt(face, i + 1, j));
        }
        if (j > 0) {
          neighbors.push(cellAt(face, i, j - 1));
        }
        if (j < resolution - 1) {
          neighbors.push(cellAt(face, i, j + 1));
        }
        if (i === 0 || j === 0 || i === resolution - 1 || j === resolution - 1) {
          edgeIndices.push(index);
        }
      }
    }
  }

  // Stitch faces together: an edge cell's missing neighbours are the nearest edge cells on other
  // faces, which is exact enough at grid resolution and avoids hand-coding twelve cube-edge maps.
  const faceOf = (index: number): number => Math.floor(index / (resolution * resolution));
  for (const index of edgeIndices) {
    const cell = cells[index];
    const missing = 4 - cell.neighbors.length;
    if (missing <= 0) {
      continue;
    }

    const candidates = edgeIndices
      .filter((other) => faceOf(other) !== faceOf(index))
      .map((other) => ({ other, distance: dot(cell.unit, cells[other].unit) }))
      .sort((left, right) => right.distance - left.distance)
      .slice(0, missing);

    for (const { other } of candidates) {
      if (!cell.neighbors.includes(other)) {
        cell.neighbors.push(other);
      }
      if (!cells[other].neighbors.includes(index)) {
        cells[other].neighbors.push(index);
      }
    }
  }

  const findNearest = (unit: Vec3): number => {
    let best = 0;
    let bestDot = -Infinity;
    for (const cell of cells) {
      const value = dot(unit, cell.unit);
      if (value > bestDot) {
        bestDot = value;
        best = cell.index;
      }
    }
    return best;
  };

  return { resolution, waterLevel: config.waterLevel, cells, findNearest };
};

/** Whether a cell can be traversed by the given domain. */
export const isPassable = (grid: NavGrid, index: number, domain: Domain, cruiseElevation = Infinity): boolean => {
  const { elevation } = grid.cells[index];
  switch (domain) {
    case 'sea':
      return elevation < grid.waterLevel;
    case 'land':
      return elevation >= grid.waterLevel && elevation < grid.waterLevel + LAND_SLOPE_CEILING * (1 - grid.waterLevel);
    case 'air':
      return elevation < cruiseElevation;
  }
};
```

- [ ] **Step 4: Run to verify it passes.**

Run: `/Users/burdon/.proto/shims/moon run plugin-terra:test -- src/sim/nav-grid.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit.**

```bash
pnpm format
git add packages/plugins/plugin-terra/src/sim
git commit -m "plugin-terra: cubed-sphere navigation grid"
```

---

### Task 3: Route planning (`route.ts`)

**Files:**

- Create: `packages/plugins/plugin-terra/src/sim/route.ts`
- Test: `packages/plugins/plugin-terra/src/sim/route.test.ts`

**Interfaces:**

- Consumes: `Vec3`, `dot` from `../engine`; `NavGrid`, `Domain`, `isPassable` from `./nav-grid`; `angleBetween` from `./geo`.
- Produces:
  - `type RouteRequest = { grid: NavGrid; domain: Domain; from: Vec3; to: Vec3; cruiseElevation?: number }`
  - `planRoute(request: RouteRequest): Vec3[]` — smoothed waypoints from `from` to `to`, inclusive of the destination; `[]` when no route exists.

A* over cell indices with cost and heuristic both the central angle between cell centres (admissible: the heuristic never exceeds the true remaining great-circle distance). The raw cell path is then smoothed by a line-of-sight pass that drops intermediate waypoints whenever the straight great-circle segment between two waypoints stays passable.

- [ ] **Step 1: Write the failing test.**

```ts
//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { Terra } from '../types';
import { toUnit } from './geo';
import { buildNavGrid, isPassable } from './nav-grid';
import { planRoute } from './route';

const config = Terra.toConfigValues(Terra.make({ config: { seed: 'route-1' } }));
const grid = buildNavGrid(config, 16);

const seaCells = grid.cells.filter((cell) => isPassable(grid, cell.index, 'sea'));
const landCells = grid.cells.filter((cell) => isPassable(grid, cell.index, 'land'));

describe('planRoute', () => {
  test('the fixture seed has both sea and land to route over', () => {
    expect(seaCells.length).toBeGreaterThan(10);
    expect(landCells.length).toBeGreaterThan(10);
  });

  test('a sea route stays on water for its whole length', () => {
    const from = seaCells[0].unit;
    const to = seaCells[seaCells.length - 1].unit;
    const waypoints = planRoute({ grid, domain: 'sea', from, to });
    expect(waypoints.length).toBeGreaterThan(0);
    for (const waypoint of waypoints) {
      expect(isPassable(grid, grid.findNearest(waypoint), 'sea')).toBe(true);
    }
  });

  test('the route ends at the destination', () => {
    const from = seaCells[0].unit;
    const to = seaCells[seaCells.length - 1].unit;
    const waypoints = planRoute({ grid, domain: 'sea', from, to });
    const last = waypoints[waypoints.length - 1];
    expect(last[0]).toBeCloseTo(to[0], 9);
    expect(last[1]).toBeCloseTo(to[1], 9);
    expect(last[2]).toBeCloseTo(to[2], 9);
  });

  test('smoothing removes redundant waypoints', () => {
    const from = seaCells[0].unit;
    const to = seaCells[seaCells.length - 1].unit;
    const waypoints = planRoute({ grid, domain: 'sea', from, to });
    // A smoothed path is far shorter than the cell-by-cell path it came from.
    expect(waypoints.length).toBeLessThan(grid.cells.length / 4);
  });

  test('an unreachable destination yields no route', () => {
    const from = seaCells[0].unit;
    const to = landCells[0].unit; // Land is not passable for a boat.
    expect(planRoute({ grid, domain: 'sea', from, to })).toEqual([]);
  });

  test('is deterministic', () => {
    const from = seaCells[0].unit;
    const to = seaCells[seaCells.length - 1].unit;
    const first = planRoute({ grid, domain: 'sea', from, to });
    const second = planRoute({ grid, domain: 'sea', from, to });
    expect(first).toEqual(second);
  });

  test('air routes ignore terrain below the cruise elevation', () => {
    const from = toUnit({ lat: 10, lng: 10 });
    const to = toUnit({ lat: -20, lng: 140 });
    expect(planRoute({ grid, domain: 'air', from, to }).length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run to verify it fails.**

Run: `/Users/burdon/.proto/shims/moon run plugin-terra:test -- src/sim/route.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `route.ts`.**

```ts
//
// Copyright 2026 DXOS.org
//

import { type Vec3, normalize, add, scale } from '../engine';
import { angleBetween } from './geo';
import { type Domain, type NavGrid, isPassable } from './nav-grid';

export type RouteRequest = {
  grid: NavGrid;
  domain: Domain;
  from: Vec3;
  to: Vec3;
  cruiseElevation?: number;
};

/** Samples along a great-circle segment when testing whether it can be flown/sailed directly. */
const SMOOTHING_SAMPLES = 6;

/** Interpolates along the great circle between two unit vectors. */
const slerp = (from: Vec3, to: Vec3, fraction: number): Vec3 => {
  const angle = angleBetween(from, to);
  if (angle < 1e-9) {
    return from;
  }
  const sin = Math.sin(angle);
  const left = Math.sin((1 - fraction) * angle) / sin;
  const right = Math.sin(fraction * angle) / sin;
  return normalize(add(scale(from, left), scale(to, right)));
};

/**
 * Plans a route between two points, avoiding cells the domain cannot traverse. Returns smoothed
 * waypoints ending at `to`, or an empty array when the destination is unreachable.
 */
export const planRoute = ({ grid, domain, from, to, cruiseElevation }: RouteRequest): Vec3[] => {
  const start = grid.findNearest(from);
  const goal = grid.findNearest(to);
  const passable = (index: number): boolean => isPassable(grid, index, domain, cruiseElevation);
  if (!passable(start) || !passable(goal)) {
    return [];
  }

  const heuristic = (index: number): number => angleBetween(grid.cells[index].unit, grid.cells[goal].unit);
  const cameFrom = new Map<number, number>();
  const costSoFar = new Map<number, number>([[start, 0]]);
  // A small grid makes a linear-scan frontier cheaper than maintaining a heap.
  const frontier = new Set<number>([start]);

  while (frontier.size > 0) {
    let current = -1;
    let bestEstimate = Infinity;
    for (const index of frontier) {
      const estimate = (costSoFar.get(index) ?? Infinity) + heuristic(index);
      if (estimate < bestEstimate) {
        bestEstimate = estimate;
        current = index;
      }
    }
    if (current === goal) {
      break;
    }

    frontier.delete(current);
    for (const neighbor of grid.cells[current].neighbors) {
      if (!passable(neighbor)) {
        continue;
      }
      const step = angleBetween(grid.cells[current].unit, grid.cells[neighbor].unit);
      const cost = (costSoFar.get(current) ?? Infinity) + step;
      if (cost < (costSoFar.get(neighbor) ?? Infinity)) {
        costSoFar.set(neighbor, cost);
        cameFrom.set(neighbor, current);
        frontier.add(neighbor);
      }
    }
  }

  if (goal !== start && !cameFrom.has(goal)) {
    return [];
  }

  const path: Vec3[] = [];
  for (let index = goal; index !== start; index = cameFrom.get(index) ?? start) {
    path.unshift(grid.cells[index].unit);
    if (!cameFrom.has(index)) {
      break;
    }
  }

  // Line-of-sight smoothing: keep a waypoint only when the direct segment past it is blocked.
  const clear = (segmentStart: Vec3, segmentEnd: Vec3): boolean => {
    for (let sample = 1; sample < SMOOTHING_SAMPLES; sample++) {
      const point = slerp(segmentStart, segmentEnd, sample / SMOOTHING_SAMPLES);
      if (!passable(grid.findNearest(point))) {
        return false;
      }
    }
    return true;
  };

  const smoothed: Vec3[] = [];
  let anchor = from;
  for (let index = 0; index < path.length; index++) {
    const next = path[index + 1];
    if (next && clear(anchor, next)) {
      continue;
    }
    smoothed.push(path[index]);
    anchor = path[index];
  }

  smoothed.push(to);
  return smoothed;
};
```

- [ ] **Step 4: Run to verify it passes.**

Run: `/Users/burdon/.proto/shims/moon run plugin-terra:test -- src/sim/route.test.ts`
Expected: PASS (7 tests). If the fixture seed happens to produce too little sea or land, change the seed in the test until the first test passes — do not weaken the assertions.

- [ ] **Step 5: Commit.**

```bash
pnpm format
git add packages/plugins/plugin-terra/src/sim
git commit -m "plugin-terra: A* route planning over the nav grid"
```

---

### Task 4: `TerraObject` ECHO type

**Files:**

- Create: `packages/plugins/plugin-terra/src/types/TerraObject.ts`
- Test: `packages/plugins/plugin-terra/src/types/TerraObject.test.ts`
- Modify: `packages/plugins/plugin-terra/src/types/index.ts` (add `export * as TerraObject from './TerraObject';`)
- Modify: `packages/plugins/plugin-terra/src/TerraPlugin.tsx` (register the schema)

**Interfaces:**

- Consumes: `Terra` type patterns from `./Terra`.
- Produces:
  - `TerraObject.Kind = 'boat' | 'plane' | 'satellite' | 'tank' | 'rocket'`
  - `TerraObject.GeoPointSchema` (Effect Schema struct: `lat`, `lng`, `height`)
  - `TerraObject.Orbit` (Effect Schema struct: `altitude`, `inclination`, `phase`, `period`)
  - `TerraObject.TerraObject` — ECHO class, DXN `org.dxos.type.terra.object` v0.1.0, fields: `kind`, `name?`, `speed`, `heading?`, `source?`, `target?`, `orbit?`, `spawnedAt`.
  - `TerraObject.make(props): TerraObject`
  - `TerraObject.domainFor(kind: Kind): Domain-compatible string` — `boat`→`'sea'`, `tank`→`'land'`, `plane`/`rocket`/`satellite`→`'air'`.

Mirror `types/Terra.ts` exactly for the `Type.makeObject` / `Obj.make` / `// @import-as-namespace` idiom, and read it before writing. Read `packages/plugins/plugin-spacetime/src/types/Scene.ts` for the `Ref.Ref(...).pipe(Schema.Array)` child-collection idiom used in Task 5.

- [ ] **Step 1: Write the failing test.**

```ts
//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { TerraObject } from './index';

describe('TerraObject', () => {
  test('make() builds a routed object', () => {
    const boat = TerraObject.make({
      kind: 'boat',
      name: 'Nimbus',
      speed: 0.02,
      source: { lat: 10, lng: 20, height: 0 },
      target: { lat: -5, lng: 40, height: 0 },
      spawnedAt: 1000,
    });
    expect(boat.kind).toBe('boat');
    expect(boat.name).toBe('Nimbus');
    expect(boat.source?.lat).toBe(10);
    expect(boat.spawnedAt).toBe(1000);
  });

  test('make() builds an orbiting object', () => {
    const satellite = TerraObject.make({
      kind: 'satellite',
      speed: 0,
      orbit: { altitude: 0.5, inclination: 45, phase: 0, period: 60 },
      spawnedAt: 0,
    });
    expect(satellite.orbit?.inclination).toBe(45);
  });

  test('domainFor maps each kind to its medium', () => {
    expect(TerraObject.domainFor('boat')).toBe('sea');
    expect(TerraObject.domainFor('tank')).toBe('land');
    expect(TerraObject.domainFor('plane')).toBe('air');
    expect(TerraObject.domainFor('rocket')).toBe('air');
    expect(TerraObject.domainFor('satellite')).toBe('air');
  });
});
```

- [ ] **Step 2: Run to verify it fails.**

Run: `/Users/burdon/.proto/shims/moon run plugin-terra:test -- src/types/TerraObject.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `TerraObject.ts`.**

```ts
//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Annotation, DXN, Obj, Type } from '@dxos/echo';
import { LabelAnnotation } from '@dxos/echo/Annotation';

import { type Domain } from '../sim/nav-grid';

/** The kinds of movable object the simulation supports. */
export const Kind = Schema.Literal('boat', 'plane', 'satellite', 'tank', 'rocket');
export type Kind = Schema.Schema.Type<typeof Kind>;

/** A position on the planet; degrees, with `height` a fraction of radius above sea level. */
export const GeoPointSchema = Schema.Struct({
  lat: Schema.Number,
  lng: Schema.Number,
  height: Schema.Number,
});

/** Circular orbit parameters for objects that never touch the surface. */
export const Orbit = Schema.Struct({
  altitude: Schema.Number,
  inclination: Schema.Number,
  phase: Schema.Number,
  period: Schema.Number,
});

export class TerraObject extends Type.makeObject<TerraObject>(DXN.make('org.dxos.type.terra.object', '0.1.0'))(
  Schema.Struct({
    kind: Kind,
    name: Schema.optional(Schema.String),
    /** Surface angular speed in radians per simulated second. */
    speed: Schema.Number,
    /** Initial bearing in degrees for objects with no destination. */
    heading: Schema.optional(Schema.Number),
    source: Schema.optional(GeoPointSchema),
    target: Schema.optional(GeoPointSchema),
    orbit: Schema.optional(Orbit),
    /** Epoch used as this object's deterministic clock origin. */
    spawnedAt: Schema.Number,
  }).pipe(
    LabelAnnotation.set(['name']),
    Annotation.IconAnnotation.set({ icon: 'ph--airplane-tilt--regular', hue: 'cyan' }),
  ),
) {}

export type MakeProps = {
  kind: Kind;
  name?: string;
  speed: number;
  heading?: number;
  source?: Schema.Schema.Type<typeof GeoPointSchema>;
  target?: Schema.Schema.Type<typeof GeoPointSchema>;
  orbit?: Schema.Schema.Type<typeof Orbit>;
  spawnedAt: number;
};

export const make = (props: MakeProps): TerraObject => Obj.make(TerraObject, props);

/** The medium a kind travels through, which selects its passability rule when routing. */
export const domainFor = (kind: Kind): Domain => {
  switch (kind) {
    case 'boat':
      return 'sea';
    case 'tank':
      return 'land';
    case 'plane':
    case 'rocket':
    case 'satellite':
      return 'air';
  }
};
```

Add to `types/index.ts`: `export * as TerraObject from './TerraObject';`. In `TerraPlugin.tsx`, extend the schema module to `AppPlugin.addSchemaModule({ schema: [Terra.Terra, TerraObject.TerraObject] })` and import `TerraObject` from `#types`.

- [ ] **Step 4: Run to verify it passes, then run the whole package.**

Run: `/Users/burdon/.proto/shims/moon run plugin-terra:test -- src/types/TerraObject.test.ts`
Expected: PASS (3 tests).
Run: `/Users/burdon/.proto/shims/moon run plugin-terra:test && /Users/burdon/.proto/shims/moon run plugin-terra:build`
Expected: all green.

- [ ] **Step 5: Commit.**

```bash
pnpm format
git add packages/plugins/plugin-terra/src
git commit -m "plugin-terra: TerraObject ECHO type"
```

---

### Task 5: Motion controllers (`motion.ts`)

**Files:**

- Create: `packages/plugins/plugin-terra/src/sim/motion.ts`
- Test: `packages/plugins/plugin-terra/src/sim/motion.test.ts`

**Interfaces:**

- Consumes: `Vec3`, `TerraConfigValues`, `radiusAt`, `seaRadius`, `makeSampler` from `../engine`; `advance`, `angleBetween`, `bearingTo`, `toUnit`, `turnToward` from `./geo`; `TerraObject` types.
- Produces:
  - `type ObjectState = { unit: Vec3; radius: number; bearing: number; waypoints: Vec3[]; waypointIndex: number; phase: RocketPhase }`
  - `type RocketPhase = 'boost' | 'cruise' | 'descent'`
  - `type MotionContext = { config: TerraConfigValues; elapsed: number }` — `elapsed` is simulated seconds since the object's `spawnedAt`.
  - `initialState(definition, config): ObjectState`
  - `stepSurface(state, definition, context, dt): ObjectState` — boats and tanks.
  - `stepAltitude(state, definition, context, dt): ObjectState` — planes.
  - `stepOrbit(state, definition, context): ObjectState` — closed form, ignores `dt`.
  - `stepBallistic(state, definition, context): ObjectState` — rockets; closed form from elapsed time.
  - `step(state, definition, context, dt): ObjectState` — dispatches on `definition.kind`.

`radius` is the distance from the planet centre: surface objects sit at `max(seaRadius, radiusAt(elevation))`; planes at `seaRadius × (1 + CRUISE_ALTITUDE)`; satellites at `seaRadius × (1 + orbit.altitude)`; rockets interpolate from surface to `seaRadius × (1 + BALLISTIC_APEX)` and back.

- [ ] **Step 1: Write the failing test.**

```ts
//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { Terra, TerraObject } from '../types';
import { angleBetween, toUnit } from './geo';
import { initialState, step } from './motion';

const config = Terra.toConfigValues(Terra.make({ config: { seed: 'motion-1' } }));

const boat = TerraObject.make({
  kind: 'boat',
  speed: 0.05,
  source: { lat: 0, lng: 0, height: 0 },
  target: { lat: 0, lng: 30, height: 0 },
  spawnedAt: 0,
});

const satellite = TerraObject.make({
  kind: 'satellite',
  speed: 0,
  orbit: { altitude: 0.5, inclination: 30, phase: 0, period: 60 },
  spawnedAt: 0,
});

const rocket = TerraObject.make({
  kind: 'rocket',
  speed: 0.05,
  source: { lat: 0, lng: 0, height: 0 },
  target: { lat: 20, lng: 20, height: 0 },
  spawnedAt: 0,
});

describe('motion', () => {
  test('initial state sits on the source point', () => {
    const state = initialState(boat, config);
    const source = toUnit({ lat: 0, lng: 0 });
    expect(angleBetween(state.unit, source)).toBeCloseTo(0, 6);
  });

  test('a surface object moves toward its waypoint', () => {
    const start = { ...initialState(boat, config), waypoints: [toUnit({ lat: 0, lng: 30 })], waypointIndex: 0 };
    const moved = step(start, boat, { config, elapsed: 1 }, 1);
    const target = toUnit({ lat: 0, lng: 30 });
    expect(angleBetween(moved.unit, target)).toBeLessThan(angleBetween(start.unit, target));
  });

  test('a surface object never leaves the planet surface', () => {
    let state = { ...initialState(boat, config), waypoints: [toUnit({ lat: 0, lng: 30 })], waypointIndex: 0 };
    for (let tick = 0; tick < 20; tick++) {
      state = step(state, boat, { config, elapsed: tick }, 0.5);
      expect(Math.hypot(...state.unit)).toBeCloseTo(1, 9);
      expect(state.radius).toBeGreaterThan(0);
    }
  });

  test('an orbit is closed form: the same elapsed time gives the same position', () => {
    const first = step(initialState(satellite, config), satellite, { config, elapsed: 12.5 }, 0.016);
    const second = step(initialState(satellite, config), satellite, { config, elapsed: 12.5 }, 0.016);
    expect(first.unit).toEqual(second.unit);
  });

  test('an orbit returns to its start after one period', () => {
    const atZero = step(initialState(satellite, config), satellite, { config, elapsed: 0 }, 0.016);
    const atPeriod = step(initialState(satellite, config), satellite, { config, elapsed: 60 }, 0.016);
    expect(angleBetween(atZero.unit, atPeriod.unit)).toBeCloseTo(0, 6);
  });

  test('an orbiting object stays above the surface', () => {
    const state = step(initialState(satellite, config), satellite, { config, elapsed: 7 }, 0.016);
    expect(state.radius).toBeGreaterThan(config.radius);
  });

  test('a rocket climbs then descends through its phases', () => {
    const boost = step(initialState(rocket, config), rocket, { config, elapsed: 0.1 }, 0.016);
    const cruise = step(initialState(rocket, config), rocket, { config, elapsed: 5 }, 0.016);
    const descent = step(initialState(rocket, config), rocket, { config, elapsed: 100 }, 0.016);
    expect(boost.phase).toBe('boost');
    expect(cruise.phase).toBe('cruise');
    expect(descent.phase).toBe('descent');
    expect(cruise.radius).toBeGreaterThan(boost.radius);
  });

  test('a rocket ends at its target', () => {
    const landed = step(initialState(rocket, config), rocket, { config, elapsed: 1e6 }, 0.016);
    expect(angleBetween(landed.unit, toUnit({ lat: 20, lng: 20 }))).toBeCloseTo(0, 4);
  });
});
```

- [ ] **Step 2: Run to verify it fails.**

Run: `/Users/burdon/.proto/shims/moon run plugin-terra:test -- src/sim/motion.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `motion.ts`.**

```ts
//
// Copyright 2026 DXOS.org
//

import {
  type TerraConfigValues,
  type Vec3,
  add,
  cross,
  makeSampler,
  normalize,
  radiusAt,
  scale,
  seaRadius,
} from '../engine';
import { type TerraObject } from '../types';
import { advance, angleBetween, bearingTo, toUnit, turnToward } from './geo';

export type RocketPhase = 'boost' | 'cruise' | 'descent';

export type ObjectState = {
  unit: Vec3;
  radius: number;
  bearing: number;
  waypoints: Vec3[];
  waypointIndex: number;
  phase: RocketPhase;
};

export type MotionContext = {
  config: TerraConfigValues;
  /** Simulated seconds since the object's `spawnedAt`. */
  elapsed: number;
};

/** Cruise height for aircraft, as a fraction of the sea-level radius. */
const CRUISE_ALTITUDE = 0.06;

/** Apex height for a ballistic arc, as a fraction of the sea-level radius. */
const BALLISTIC_APEX = 0.35;

/** Fraction of a rocket's flight spent climbing, and the fraction at which descent begins. */
const BOOST_FRACTION = 0.15;
const DESCENT_FRACTION = 0.85;

/** Degrees per second a surface object may turn; keeps tracks readable rather than instant. */
const TURN_RATE = 90;

/** Distance (radians) within which a waypoint counts as reached. */
const ARRIVAL_ANGLE = 0.01;

const surfaceRadius = (config: TerraConfigValues, unit: Vec3): number => {
  const { elevation } = makeSampler(config);
  // Clamp to the sea surface so boats float rather than sinking to the ocean floor.
  return Math.max(seaRadius(config), radiusAt(config, elevation(unit)));
};

/** Starting state for an object, placed at its source (or at the sub-orbital point for satellites). */
export const initialState = (definition: TerraObject.TerraObject, config: TerraConfigValues): ObjectState => {
  const unit = definition.source ? toUnit(definition.source) : toUnit({ lat: 0, lng: 0 });
  return {
    unit,
    radius: surfaceRadius(config, unit),
    bearing: definition.heading ?? 0,
    waypoints: [],
    waypointIndex: 0,
    phase: 'boost',
  };
};

/** Advances a waypoint-following object across the surface. */
export const stepSurface = (
  state: ObjectState,
  definition: TerraObject.TerraObject,
  { config }: MotionContext,
  dt: number,
): ObjectState => {
  const waypoint = state.waypoints[state.waypointIndex];
  if (!waypoint) {
    return state;
  }

  const reached = angleBetween(state.unit, waypoint) < ARRIVAL_ANGLE;
  const waypointIndex = reached ? Math.min(state.waypointIndex + 1, state.waypoints.length) : state.waypointIndex;
  const active = state.waypoints[waypointIndex];
  if (!active) {
    return { ...state, waypointIndex };
  }

  const bearing = turnToward(state.bearing, bearingTo(state.unit, active), TURN_RATE * dt);
  const unit = advance(state.unit, bearing, definition.speed * dt);
  return { ...state, unit, bearing, waypointIndex, radius: surfaceRadius(config, unit) };
};

/** As `stepSurface`, but held at cruise altitude. */
export const stepAltitude = (
  state: ObjectState,
  definition: TerraObject.TerraObject,
  context: MotionContext,
  dt: number,
): ObjectState => {
  const moved = stepSurface(state, definition, context, dt);
  return { ...moved, radius: seaRadius(context.config) * (1 + CRUISE_ALTITUDE) };
};

/** Closed-form circular orbit; position depends only on elapsed time, so peers always agree. */
export const stepOrbit = (
  state: ObjectState,
  definition: TerraObject.TerraObject,
  { config, elapsed }: MotionContext,
): ObjectState => {
  const orbit = definition.orbit;
  if (!orbit) {
    return state;
  }

  const angle = orbit.phase + (elapsed / orbit.period) * Math.PI * 2;
  const inclination = orbit.inclination * (Math.PI / 180);
  // Build the orbital plane from an equatorial circle tilted by the inclination.
  const equatorial: Vec3 = [Math.cos(angle), 0, Math.sin(angle)];
  const unit = normalize([equatorial[0], equatorial[2] * Math.sin(inclination), equatorial[2] * Math.cos(inclination)]);
  const ahead = angle + 1e-3;
  const nextEquatorial: Vec3 = [Math.cos(ahead), 0, Math.sin(ahead)];
  const next = normalize([
    nextEquatorial[0],
    nextEquatorial[2] * Math.sin(inclination),
    nextEquatorial[2] * Math.cos(inclination),
  ]);
  return {
    ...state,
    unit,
    radius: seaRadius(config) * (1 + orbit.altitude),
    bearing: bearingTo(unit, next),
    phase: 'cruise',
  };
};

/** Closed-form ballistic arc from source to target, climbing to an apex and descending. */
export const stepBallistic = (
  state: ObjectState,
  definition: TerraObject.TerraObject,
  { config, elapsed }: MotionContext,
): ObjectState => {
  const { source, target } = definition;
  if (!source || !target) {
    return state;
  }

  const from = toUnit(source);
  const to = toUnit(target);
  const total = angleBetween(from, to);
  const duration = definition.speed > 0 ? total / definition.speed : 0;
  const fraction = duration > 0 ? Math.min(1, elapsed / duration) : 1;

  const angle = angleBetween(from, to);
  const unit =
    angle < 1e-9
      ? from
      : normalize(
          add(
            scale(from, Math.sin((1 - fraction) * angle) / Math.sin(angle)),
            scale(to, Math.sin(fraction * angle) / Math.sin(angle)),
          ),
        );

  // A sine bump gives zero extra height at both ends and the apex at mid-flight.
  const altitude = BALLISTIC_APEX * Math.sin(fraction * Math.PI);
  const phase: RocketPhase = fraction < BOOST_FRACTION ? 'boost' : fraction < DESCENT_FRACTION ? 'cruise' : 'descent';
  const surface = surfaceRadius(config, unit);
  return {
    ...state,
    unit,
    radius: Math.max(surface, seaRadius(config) * (1 + altitude)),
    bearing: angle < 1e-9 ? state.bearing : bearingTo(unit, to),
    phase,
  };
};

/** Advances one object by its kind's motion model. */
export const step = (
  state: ObjectState,
  definition: TerraObject.TerraObject,
  context: MotionContext,
  dt: number,
): ObjectState => {
  switch (definition.kind) {
    case 'boat':
    case 'tank':
      return stepSurface(state, definition, context, dt);
    case 'plane':
      return stepAltitude(state, definition, context, dt);
    case 'satellite':
      return stepOrbit(state, definition, context);
    case 'rocket':
      return stepBallistic(state, definition, context);
  }
};
```

Note: `cross` is imported for the orbital-plane construction only if you need a general basis; if the implementation above does not use it, remove the unused import rather than leaving it.

- [ ] **Step 4: Run to verify it passes.**

Run: `/Users/burdon/.proto/shims/moon run plugin-terra:test -- src/sim/motion.test.ts`
Expected: PASS (8 tests).

- [ ] **Step 5: Commit.**

```bash
pnpm format
git add packages/plugins/plugin-terra/src/sim
git commit -m "plugin-terra: motion controllers for each object kind"
```

---

### Task 6: Simulation engine (`engine.ts`, `sim/index.ts`)

**Files:**

- Create: `packages/plugins/plugin-terra/src/sim/engine.ts`
- Create: `packages/plugins/plugin-terra/src/sim/index.ts`
- Test: `packages/plugins/plugin-terra/src/sim/engine.test.ts`

**Interfaces:**

- Consumes: everything above.
- Produces:
  - `type SimObject = { definition: TerraObject.TerraObject; state: ObjectState }`
  - `class SimEngine`:
    - `constructor(options: { config: TerraConfigValues; definitions: readonly TerraObject.TerraObject[]; grid?: NavGrid })`
    - `get objects(): readonly SimObject[]`
    - `tick(nowMs: number): void` — advances every object; the first call establishes the clock origin without moving anything.
    - `reset(): void`
  - `REPLAN_INTERVAL_MS` — exported so tests and callers agree on the schedule.

Determinism: replans for an object happen when `floor((nowMs - spawnedAt) / REPLAN_INTERVAL_MS)` increases, so the schedule is a function of wall-clock and `spawnedAt` only — never of when the local session started.

- [ ] **Step 1: Write the failing test.**

```ts
//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { Terra, TerraObject } from '../types';
import { SimEngine } from './engine';

const config = Terra.toConfigValues(Terra.make({ config: { seed: 'engine-1' } }));

const definitions = [
  TerraObject.make({
    kind: 'satellite',
    speed: 0,
    orbit: { altitude: 0.5, inclination: 20, phase: 0, period: 30 },
    spawnedAt: 0,
  }),
  TerraObject.make({
    kind: 'rocket',
    speed: 0.02,
    source: { lat: 0, lng: 0, height: 0 },
    target: { lat: 30, lng: 45, height: 0 },
    spawnedAt: 0,
  }),
];

const runTo = (engine: SimEngine, times: number[]): void => {
  for (const time of times) {
    engine.tick(time);
  }
};

describe('SimEngine', () => {
  test('exposes one runtime object per definition', () => {
    const engine = new SimEngine({ config, definitions });
    expect(engine.objects).toHaveLength(definitions.length);
  });

  test('the first tick establishes the clock without moving anything', () => {
    const engine = new SimEngine({ config, definitions });
    const before = engine.objects.map((object) => object.state.unit);
    engine.tick(1_000);
    expect(engine.objects.map((object) => object.state.unit)).toEqual(before);
  });

  test('objects move once time advances', () => {
    const engine = new SimEngine({ config, definitions });
    const before = engine.objects[0].state.unit;
    runTo(engine, [1_000, 6_000]);
    expect(engine.objects[0].state.unit).not.toEqual(before);
  });

  test('identical definitions and clocks give identical positions', () => {
    const first = new SimEngine({ config, definitions });
    const second = new SimEngine({ config, definitions });
    const schedule = [0, 500, 1_200, 3_400, 9_000];
    runTo(first, schedule);
    runTo(second, schedule);
    expect(first.objects.map((object) => object.state)).toEqual(second.objects.map((object) => object.state));
  });

  test('replays to the same place regardless of tick granularity for closed-form objects', () => {
    const coarse = new SimEngine({ config, definitions });
    const fine = new SimEngine({ config, definitions });
    runTo(coarse, [0, 10_000]);
    runTo(fine, [0, 2_000, 4_000, 6_000, 8_000, 10_000]);
    // The satellite is closed form, so its position depends only on the final clock reading.
    expect(coarse.objects[0].state.unit).toEqual(fine.objects[0].state.unit);
  });

  test('reset returns objects to their initial state', () => {
    const engine = new SimEngine({ config, definitions });
    const before = engine.objects.map((object) => object.state.unit);
    runTo(engine, [0, 5_000]);
    engine.reset();
    expect(engine.objects.map((object) => object.state.unit)).toEqual(before);
  });
});
```

- [ ] **Step 2: Run to verify it fails.**

Run: `/Users/burdon/.proto/shims/moon run plugin-terra:test -- src/sim/engine.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `engine.ts`.**

```ts
//
// Copyright 2026 DXOS.org
//

import { type TerraConfigValues } from '../engine';
import { type TerraObject } from '../types';
import { type ObjectState, type MotionContext, initialState, step } from './motion';
import { type NavGrid, buildNavGrid } from './nav-grid';
import { planRoute } from './route';
import { toUnit } from './geo';

/** How often a routed object recomputes its course, in milliseconds of simulated clock. */
export const REPLAN_INTERVAL_MS = 20_000;

export type SimObject = {
  definition: TerraObject.TerraObject;
  state: ObjectState;
};

export type SimEngineOptions = {
  config: TerraConfigValues;
  definitions: readonly TerraObject.TerraObject[];
  /** Prebuilt grid; supplied by callers that already built one for the same config. */
  grid?: NavGrid;
};

/**
 * Advances every object each frame. Positions are derived from the ECHO definitions and the clock
 * alone, so any peer replaying the same definitions reaches the same state.
 */
export class SimEngine {
  readonly #config: TerraConfigValues;
  readonly #grid: NavGrid;
  #objects: SimObject[];
  #lastTick: number | undefined;
  #replanCounters = new Map<TerraObject.TerraObject, number>();

  constructor({ config, definitions, grid }: SimEngineOptions) {
    this.#config = config;
    this.#grid = grid ?? buildNavGrid(config);
    this.#objects = definitions.map((definition) => ({
      definition,
      state: initialState(definition, config),
    }));
  }

  get objects(): readonly SimObject[] {
    return this.#objects;
  }

  /** Advances the simulation to `nowMs`. The first call only establishes the clock origin. */
  tick(nowMs: number): void {
    const previous = this.#lastTick;
    this.#lastTick = nowMs;
    if (previous === undefined) {
      return;
    }

    const dt = Math.max(0, (nowMs - previous) / 1000);
    this.#objects = this.#objects.map(({ definition, state }) => {
      const context: MotionContext = { config: this.#config, elapsed: (nowMs - definition.spawnedAt) / 1000 };
      const routed = this.#maybeReplan(definition, state, nowMs);
      return { definition, state: step(routed, definition, context, dt) };
    });
  }

  /** Restores every object to its spawn state and forgets the clock. */
  reset(): void {
    this.#objects = this.#objects.map(({ definition }) => ({
      definition,
      state: initialState(definition, this.#config),
    }));
    this.#lastTick = undefined;
    this.#replanCounters.clear();
  }

  /**
   * Recomputes a route when the object crosses a replan boundary. The boundary is derived from
   * `spawnedAt`, not from when this session started, so peers replan in lockstep.
   */
  #maybeReplan(definition: TerraObject.TerraObject, state: ObjectState, nowMs: number): ObjectState {
    const { source, target, kind } = definition;
    if (!source || !target || kind === 'satellite' || kind === 'rocket') {
      return state;
    }

    const period = Math.floor((nowMs - definition.spawnedAt) / REPLAN_INTERVAL_MS);
    if (this.#replanCounters.get(definition) === period && state.waypoints.length > 0) {
      return state;
    }
    this.#replanCounters.set(definition, period);

    const waypoints = planRoute({
      grid: this.#grid,
      domain: TerraObjectDomain(definition),
      from: state.unit,
      to: toUnit(target),
    });
    return waypoints.length > 0 ? { ...state, waypoints, waypointIndex: 0 } : state;
  }
}

/** Local helper kept out of the class so the domain mapping stays a pure function. */
const TerraObjectDomain = (definition: TerraObject.TerraObject) => {
  switch (definition.kind) {
    case 'boat':
      return 'sea' as const;
    case 'tank':
      return 'land' as const;
    default:
      return 'air' as const;
  }
};
```

Then create `sim/index.ts`:

```ts
//
// Copyright 2026 DXOS.org
//

export * from './geo';
export * from './nav-grid';
export * from './route';
export * from './motion';
export * from './engine';
```

- [ ] **Step 4: Run to verify it passes, then the whole package.**

Run: `/Users/burdon/.proto/shims/moon run plugin-terra:test -- src/sim/engine.test.ts`
Expected: PASS (6 tests).
Run: `/Users/burdon/.proto/shims/moon run plugin-terra:test`
Expected: all suites green.

- [ ] **Step 5: Commit.**

```bash
pnpm format
git add packages/plugins/plugin-terra/src/sim
git commit -m "plugin-terra: deterministic simulation engine"
```

---

### Task 7: Object meshes (`scene/object-forms.ts`)

**Files:**

- Create: `packages/plugins/plugin-terra/src/scene/object-forms.ts`
- Create: `packages/plugins/plugin-terra/src/scene/index.ts`

**Interfaces:**

- Consumes: `@babylonjs/core` builders (`CreateBox`, `CreateCylinder`, `CreateSphere`), `Mesh`, `StandardMaterial`, `Color3`, `Scene`.
- Produces: `createObjectForm(kind: TerraObject.Kind, scene: Scene): Mesh` — a merged, flat-shaded, matte base mesh for one kind, `isVisible = false` (thin instances render it).

Each form is built from simple primitives and merged with `Mesh.MergeMeshes(parts, true, true, undefined, false, false)`, then `convertToFlatShadedMesh()`. Materials are matte (`specularColor` black), matching Phase 1's NPR style. Forms are authored at roughly unit scale along their forward axis (+Z); `object-layer.ts` scales them planet-relative.

- **plane:** fuselage cylinder along Z + nose cone (cylinder with `diameterTop: 0`) + two wing boxes + tail box.
- **rocket:** body cylinder + nose cone + three fin boxes.
- **boat:** hull box (tapered via scaling) + cabin box.
- **tank:** hull box + turret box + barrel cylinder.
- **satellite:** body box + two thin panel boxes.

Read `packages/plugins/plugin-terra/src/engine/scene-manager.ts` for the existing matte-material helper and merge/flat-shade idiom, and reuse the same approach rather than inventing a second one.

- [ ] **Step 1: Implement `object-forms.ts`** with one builder function per kind and a `createObjectForm` dispatcher. Use `Mesh.MergeMeshes(...)`'s nullable return with an explicit `if (!merged) { throw new Error(...) }` — never a non-null assertion. Give each kind a distinct matte colour (plane light grey, rocket white, boat dark slate, tank olive, satellite gold).

- [ ] **Step 2: Create `scene/index.ts`** exporting `./object-forms` (and `./object-layer` in Task 8).

- [ ] **Step 3: Verify it compiles.**

Run: `/Users/burdon/.proto/shims/moon run plugin-terra:build && /Users/burdon/.proto/shims/moon run plugin-terra:lint -- --fix`
Expected: green. (Babylon mesh construction is validated visually in Task 8, not by a unit test.)

- [ ] **Step 4: Commit.**

```bash
pnpm format
git add packages/plugins/plugin-terra/src/scene
git commit -m "plugin-terra: low-poly object meshes"
```

---

### Task 8: Object layer + article integration + story

**Files:**

- Create: `packages/plugins/plugin-terra/src/scene/object-layer.ts`
- Modify: `packages/plugins/plugin-terra/src/scene/index.ts`
- Modify: `packages/plugins/plugin-terra/src/types/Terra.ts` (add the `objects` ref array and demo seeding)
- Modify: `packages/plugins/plugin-terra/src/containers/TerraArticle/TerraArticle.tsx`
- Modify: `packages/plugins/plugin-terra/src/containers/TerraArticle/TerraArticle.stories.tsx`
- Test: `packages/plugins/plugin-terra/src/types/Terra.test.ts` (extend for demo seeding)

**Interfaces:**

- Produces:
  - `class ObjectLayer`:
    - `constructor(options: { scene: Scene; kinds: readonly TerraObject.Kind[]; radius: number })`
    - `update(objects: readonly SimObject[]): void` — writes one thin-instance matrix per object.
    - `dispose(): void`
  - `Terra.Terra` gains `objects: Ref.Ref(TerraObject.TerraObject)[]`.
  - `Terra.makeDemoWorld(props?): Terra` — a world seeded with two objects of each kind.

Orientation: forward is the velocity direction (from `state.bearing` via the tangent frame), up is the surface normal (`state.unit`); satellites use the orbit tangent, which `stepOrbit` already stores as `bearing`. Build the matrix with `Matrix.Compose(scaling, Quaternion.FromLookDirectionLH(forward, up), position)` where `position = scale(state.unit, state.radius)`.

- [ ] **Step 1: Add the `objects` collection and demo seeding to `Terra.ts`.** Follow `plugin-spacetime/src/types/Scene.ts` for `Ref.Ref(TerraObject.TerraObject).pipe(Schema.Array, FormInputAnnotation.set(false))` plus `Obj.setParent(child, parent)`. `makeDemoWorld` creates two of each kind with `spawnedAt: 0`:
  - boats and tanks: source/target chosen so they are plausibly on water/land for the default seed (derive them by sampling the nav grid for a passable cell rather than hard-coding coordinates, so the demo works for any seed);
  - planes: long cross-continent source/target pairs;
  - rockets: source/target pairs with a long separation;
  - satellites: two orbits with different inclination and period.

  Because `makeDemoWorld` runs at object-creation time and must stay deterministic, derive placement from `buildNavGrid(toConfigValues(...))` — not from `Math.random()`.

- [ ] **Step 2: Extend `Terra.test.ts`** to assert `makeDemoWorld()` produces exactly ten objects, two per kind, that boat sources land on sea cells and tank sources on land cells (via `buildNavGrid`/`isPassable`), and that two calls with the same seed produce identical placements.

- [ ] **Step 3: Run the test to verify it fails, then implement until green.**

Run: `/Users/burdon/.proto/shims/moon run plugin-terra:test -- src/types/Terra.test.ts`

- [ ] **Step 4: Implement `object-layer.ts`.** One base mesh per kind via `createObjectForm`, thin-instance buffers grouped by kind, rebuilt when the object count for a kind changes and otherwise updated in place with `thinInstanceSetBuffer('matrix', buffer, 16, true)`. Scale each instance to `radius * 0.02`. Store nothing that outlives `dispose()`.

- [ ] **Step 5: Wire the article.** In `TerraArticle.tsx`:
  - read the object definitions from `terra.objects` (resolve the refs);
  - construct `SimEngine` and `ObjectLayer` in the mount-once effect, after `SceneManager`;
  - drive them from the render loop via `manager.scene.onBeforeRenderObservable.add(() => { engine.tick(performance.now()); layer.update(engine.objects); })`, storing the observer and removing it on cleanup;
  - dispose the layer before the manager;
  - rebuild the `SimEngine` when the config changes (the nav grid depends on the seed) inside the existing debounced values effect.

  Keep the existing `<Panel.Toolbar />`, the canvas `outline-none`, the `TerraForm` overlay, and the debounced regeneration untouched.

- [ ] **Step 6: Add an animated story.** Extend `TerraArticle.stories.tsx` with an `Objects` story that builds `Terra.makeDemoWorld({ config: { seed: 'terra-1', resolution: 128 } })` inside `useMemo` in a render function.

- [ ] **Step 7: Verify.**

Run: `/Users/burdon/.proto/shims/moon run plugin-terra:build && /Users/burdon/.proto/shims/moon run plugin-terra:lint -- --fix && /Users/burdon/.proto/shims/moon run plugin-terra:test`
Expected: all green. The controller performs storybook visual verification (objects visible, oriented to the surface, moving; satellites orbiting; rockets arcing; FPS acceptable with ten objects).

- [ ] **Step 8: Commit.**

```bash
pnpm format
git add packages/plugins/plugin-terra/src
git commit -m "plugin-terra: render and animate simulation objects"
```

---

### Task 9: Smoke trails (`sim/trail.ts`, `scene/trail-layer.ts`)

> Added 2026-07-27 (user directive): ships and planes leave chains of small
> translucent white spheres that trail and fade; rockets reuse it as exhaust.
> Design: the "Smoke trails" section of the Phase 2 spec.

**Files:**

- Create: `packages/plugins/plugin-terra/src/sim/trail.ts`
- Test: `packages/plugins/plugin-terra/src/sim/trail.test.ts`
- Create: `packages/plugins/plugin-terra/src/scene/trail-layer.ts`
- Modify: `packages/plugins/plugin-terra/src/sim/index.ts`, `src/scene/index.ts`
- Modify: `packages/plugins/plugin-terra/src/containers/TerraArticle/TerraArticle.tsx`

**Interfaces:**

- Consumes: `Vec3`, `sub`, `scale`, `add`, `normalize` from `../engine`; `SimObject` from `./engine`; `TerraObject.Kind`.
- Produces (`sim/trail.ts`, pure — NO Babylon):
  - `type Puff = { position: Vec3; bornAt: number }`
  - `type Trail = { puffs: Puff[]; head: number; count: number; lastEmit: Vec3 | undefined }`
  - `type TrailSpec = { spacing: number; lifetimeMs: number; capacity: number; startRadius: number; endScale: number; startAlpha: number }`
  - `const TRAIL_SPECS: Partial<Record<TerraObject.Kind, TrailSpec>>` — boat, plane, rocket only.
  - `createTrail(capacity: number): Trail`
  - `emit(trail: Trail, position: Vec3, nowMs: number, spec: TrailSpec): Trail` — appends only when the object has moved `spec.spacing` from `lastEmit`; otherwise returns the trail unchanged.
  - `activePuffs(trail: Trail, nowMs: number, spec: TrailSpec): { position: Vec3; age: number }[]` — `age` normalized `[0, 1]`; expired puffs omitted.
- Produces (`scene/trail-layer.ts`, Babylon):
  - `class TrailLayer { constructor(options: { scene: Scene }); update(objects: readonly SimObject[], nowMs: number): void; dispose(): void }`

- [ ] **Step 1: Write the failing test** (`sim/trail.test.ts`). Cover, with real assertions:
  - `emit` adds nothing until the object has moved at least `spacing` from the last emission point;
  - `emit` DOES add once it has moved past `spacing`, and updates `lastEmit`;
  - the ring buffer never exceeds `capacity` and overwrites oldest-first (emit `capacity + 5` puffs along a straight line, assert `activePuffs` length is `capacity` and the earliest positions are gone);
  - `activePuffs` omits puffs older than `lifetimeMs` and reports `age` increasing with puff age, bounded to `[0, 1]`;
  - determinism: the same position/time sequence produces identical puff arrays.

- [ ] **Step 2: Run to verify it fails.**

Run: `/Users/burdon/.proto/shims/moon run plugin-terra:test -- src/sim/trail.test.ts`
Expected: FAIL (`./trail` not found).

- [ ] **Step 3: Implement `sim/trail.ts`.** A fixed-size array of `capacity` puffs with a `head` write cursor and a `count` of how many slots are live — no allocation after warm-up. `emit` compares squared distance against `spacing²` to avoid a square root. `activePuffs` walks the live slots oldest-first and filters by `nowMs - bornAt < lifetimeMs`. `TRAIL_SPECS` supplies per-kind values; suggested starting points (tune during visual verification): boat `{ spacing: 0.012, lifetimeMs: 6000, capacity: 40, startRadius: 0.012, endScale: 2.5, startAlpha: 0.3 }`, plane `{ spacing: 0.02, lifetimeMs: 8000, capacity: 40, startRadius: 0.01, endScale: 3, startAlpha: 0.35 }`, rocket `{ spacing: 0.01, lifetimeMs: 3000, capacity: 48, startRadius: 0.014, endScale: 2, startAlpha: 0.45 }`. Export from `sim/index.ts`.

- [ ] **Step 4: Run to verify it passes.**

Run: `/Users/burdon/.proto/shims/moon run plugin-terra:test -- src/sim/trail.test.ts`
Expected: PASS.

- [ ] **Step 5: Implement `scene/trail-layer.ts`.** One `CreateSphere` base mesh (low segment count, e.g. 6), matte white `StandardMaterial` with `alpha` set, `isVisible = false`, rendered as thin instances.
  - Keep a `Map<TerraObject, Trail>` keyed by definition; on each `update`, emit at a point offset **behind** the object (subtract the forward direction scaled by a small factor from `position = scale(state.unit, state.radius)`), then rebuild the instance matrix buffer from every object's `activePuffs`.
  - Scale per puff interpolates `startRadius → startRadius * endScale` with `age`.
  - **Per-instance alpha:** attempt `thinInstanceSetBuffer('color', colors, 4)` with the material configured to consume instance colour, so each puff fades independently. **Verify this actually renders varying alpha.** If it does not, fall back to scale-only fade at constant material alpha (documented fallback) and say so in your report — do NOT leave a non-working colour buffer in place.
  - The material must not write depth, so overlapping puffs blend rather than z-fight; render after the planet.
  - `dispose()` disposes the base mesh and its material (`dispose(false, true)`), matching the existing `SceneManager` convention.
  - Export from `scene/index.ts`.

- [ ] **Step 6: Wire into `TerraArticle`.** Construct `TrailLayer` alongside `ObjectLayer` in the mount-once effect; call `layer.update(engine.objects, performance.now())` in the same `onBeforeRenderObservable` callback that ticks the sim; dispose it before the manager. Do not disturb the existing `Panel.Toolbar`, canvas classes, `TerraForm` overlay, or the debounced regeneration.

- [ ] **Step 7: Verify.**

Run: `/Users/burdon/.proto/shims/moon run plugin-terra:build && /Users/burdon/.proto/shims/moon run plugin-terra:lint -- --fix && /Users/burdon/.proto/shims/moon run plugin-terra:test`
Expected: all green, output pristine. The controller performs storybook visual verification (boats and planes leave visible fading white chains; trails sit behind the object, not through it; no z-fighting; FPS unaffected).

- [ ] **Step 8: Commit.**

```bash
pnpm format
git add packages/plugins/plugin-terra/src
git commit -m "plugin-terra: smoke trails for ships, planes, and rockets"
```

---

### Task 10: Changeset

**Files:**

- Create: `.changeset/<generated-name>.md`

- [ ] **Step 1: Add the changeset.**

```markdown
---
'@dxos/plugin-terra': patch
---

Add movable simulation objects (boats, planes, satellites, tanks, rockets) with deterministic routing and a per-frame game engine.
```

- [ ] **Step 2: Commit.**

```bash
git add .changeset
git commit -m "plugin-terra: changeset for phase 2 objects"
```

---

## Self-Review

**Spec coverage:** module layout (`sim/` pure, `scene/` Babylon) → Tasks 1–8 file structure. Determinism contract → Global Constraints + Task 6 tests (identical definitions/clock → identical state; closed-form objects independent of tick granularity; `spawnedAt`-derived replan schedule). `TerraObject` ECHO data model → Task 4. 2D→3D velocity mapping → Task 1 (`tangentFrame`/`bearingTo`/`advance`) used by Task 5's surface controllers. Motion controllers `surface | altitude | orbit | ballistic` → Task 5. A* + per-domain passability + smoothing → Tasks 2–3. Nav grid from the Phase 1 sampler → Task 2. `SimEngine` driven by the render loop → Tasks 6 and 8. Primitive-built forms (plane = cylinder + nose cone + 2 wings + tail) → Task 7. Two of each kind → Task 8 `makeDemoWorld`. Testing strategy → per-task vitest suites + the Task 8 story. Phase 3 backlog items (effects, sun, submarines, landing sites, MCP, trains) are correctly absent.

**Placeholder scan:** every code step contains complete source; test steps contain full test bodies with real assertions. Task 7 and Task 8 Steps 1/4/5 describe construction in prose rather than full listings — deliberate, because they are Babylon mesh/instancing code validated visually rather than by unit test, and the referenced in-repo idiom (`scene-manager.ts`) is named explicitly. No TBD/TODO.

**Type consistency:** `Vec3` is the Phase 1 `readonly [number, number, number]` throughout. `GeoPoint` (Task 1, TS type) and `GeoPointSchema` (Task 4, Effect Schema) are deliberately distinct names for the same shape. `Domain` is defined once in `nav-grid.ts` and imported by `TerraObject.domainFor` and `planRoute`. `ObjectState`/`MotionContext` defined in Task 5, consumed unchanged in Task 6. `SimObject` defined in Task 6, consumed by `ObjectLayer.update` in Task 8. `TerraConfigValues` is the Phase 1 type throughout.

**Known seam to watch during execution:** Task 6's `#maybeReplan` duplicates the kind→domain mapping that Task 4 exports as `TerraObject.domainFor`. The implementer should import `domainFor` and delete the local helper; it is written inline above only to keep each task's code self-contained. Flag it if the import creates a cycle (`types` → `sim/nav-grid` → `engine`), and if so move `Domain` into `sim/types.ts` and have both import from there.
