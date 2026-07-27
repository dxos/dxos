//
// Copyright 2026 DXOS.org
//

import seedrandom from 'seedrandom';
import { describe, expect, test } from 'vitest';

import { type Vec3 } from '../engine';
import { Terra, TerraObject } from '../types';
import { MAX_CATCHUP_LEGS, SimEngine } from './engine';
import { angleBetween, toGeo, toUnit } from './geo';
import { buildNavGrid, isPassable } from './nav-grid';
import { pickReachableTarget } from './reachable';

const config = Terra.toConfigValues(Terra.make({ config: { seed: 'engine-1' } }));
const grid = buildNavGrid(config, 16);

// Picked from the largest connected landmass in the grid (continents at this resolution are not all
// linked by land, so a naive pick can be unreachable), and well inside the land band rather than
// near its coastal/slope edge, where the lat/lng round trip through the object's schema could push
// `findNearest` onto an impassable neighbor. This guarantees the tank always has a route to walk.
const landBandMid = config.waterLevel + 0.175 * (1 - config.waterLevel);
const landBandHalfWidth = 0.175 * (1 - config.waterLevel);
const isSafeLand = (index: number): boolean =>
  isPassable(grid, index, 'land') && Math.abs(grid.cells[index].elevation - landBandMid) < landBandHalfWidth * 0.5;

const componentOf = new Map<number, number>();
const components: number[][] = [];
for (const cell of grid.cells) {
  if (!isPassable(grid, cell.index, 'land') || componentOf.has(cell.index)) {
    continue;
  }
  const members: number[] = [];
  const frontier = [cell.index];
  componentOf.set(cell.index, components.length);
  while (frontier.length > 0) {
    const current = frontier.shift() as number;
    members.push(current);
    for (const neighbor of grid.cells[current].neighbors) {
      if (!componentOf.has(neighbor) && isPassable(grid, neighbor, 'land')) {
        componentOf.set(neighbor, components.length);
        frontier.push(neighbor);
      }
    }
  }
  components.push(members);
}

const largestComponent = components.reduce((largest, candidate) =>
  candidate.length > largest.length ? candidate : largest,
);
const safeInLargestComponent = largestComponent.filter(isSafeLand);
if (safeInLargestComponent.length < 2) {
  throw new Error('fixture error: the largest landmass has fewer than two safe-band cells in this grid');
}

const tankSource = toGeo(grid.cells[safeInLargestComponent[0]].unit);
const tankTarget = toGeo(grid.cells[safeInLargestComponent.at(-1) as number].unit);

const boat = TerraObject.make({
  kind: 'boat',
  speed: 0.02,
  source: { lat: 0, lng: 0, height: 0 },
  target: { lat: 0, lng: 60, height: 0 },
  spawnedAt: 0,
});

const tank = TerraObject.make({
  kind: 'tank',
  speed: 0.01,
  source: { ...tankSource, height: 0 },
  target: { ...tankTarget, height: 0 },
  spawnedAt: 0,
});

const plane = TerraObject.make({
  kind: 'plane',
  speed: 0.03,
  source: { lat: -10, lng: -10, height: 0 },
  target: { lat: 30, lng: 50, height: 0 },
  spawnedAt: 0,
});

const satellite = TerraObject.make({
  kind: 'satellite',
  speed: 0,
  orbit: { altitude: 0.1, inclination: 30, phase: 0, period: 60 },
  spawnedAt: 0,
});

const definitions = [boat, tank, plane, satellite];

describe('SimEngine — determinism (the property that must survive)', () => {
  test('jumping straight to a final time matches stepping through many intermediate times', () => {
    const finalMs = 75_000;

    const direct = new SimEngine({ config, definitions, grid });
    direct.evaluateAt(finalMs);

    const stepped = new SimEngine({ config, definitions, grid });
    const intermediates = [500, 1_200, 4_000, 9_000, 17_000, 21_000, 26_500, 33_000, 41_000, 47_500, 55_000];
    for (const at of intermediates) {
      stepped.evaluateAt(at);
    }
    stepped.evaluateAt(finalMs);

    expect(stepped.objects).toEqual(direct.objects);
  });

  test('evaluateAt is idempotent for the same nowMs', () => {
    const engine = new SimEngine({ config, definitions, grid });
    engine.evaluateAt(45_000);
    const first = engine.objects;
    engine.evaluateAt(45_000);
    expect(engine.objects).toEqual(first);
  });

  test('objects move as nowMs advances', () => {
    const engine = new SimEngine({ config, definitions, grid });
    engine.evaluateAt(1_000);
    const early = engine.objects.map((object) => object.state.unit);
    engine.evaluateAt(50_000);
    const late = engine.objects.map((object) => object.state.unit);
    for (const [index, unit] of early.entries()) {
      const other = late[index];
      const moved = unit[0] !== other[0] || unit[1] !== other[1] || unit[2] !== other[2];
      expect(moved).toBe(true);
    }
  });

  test('reset() restores initial state', () => {
    const engine = new SimEngine({ config, definitions, grid });
    const initial = engine.objects;
    engine.evaluateAt(50_000);
    expect(engine.objects).not.toEqual(initial);
    engine.reset();
    expect(engine.objects).toEqual(initial);
  });

  test('a closed-form kind (satellite) never advances legs', () => {
    const engine = new SimEngine({ config, definitions: [satellite], grid });
    engine.evaluateAt(500_000);
    expect(engine.objects[0].state.leg).toBe(0);
  });

  test('a long gap still settles without throwing, bounded by MAX_CATCHUP_LEGS', () => {
    const engine = new SimEngine({ config, definitions: [boat], grid });
    const farMs = 5_000_000;
    expect(() => engine.evaluateAt(farMs)).not.toThrow();
    // A single `evaluateAt` from spawn can only walk MAX_CATCHUP_LEGS legs before snapping ahead —
    // the one documented divergence point — so `leg` can never exceed that bound in one jump.
    expect(engine.objects[0].state.leg).toBeGreaterThan(0);
    expect(engine.objects[0].state.leg).toBeLessThanOrEqual(MAX_CATCHUP_LEGS + 1);
  });
});

// A plane whose domain ('air') has no impassable cells — `nav-grid.ts`'s `isPassable('air', ...)`
// defaults `cruiseElevation` to `Infinity` when none is given, and `route.ts`'s line-of-sight
// smoothing then always collapses a leg's route to exactly `[from, to]`. That makes a leg's arc
// length just `angleBetween(from, to)`, so — unlike the tank/boat fixtures above, whose land/sea
// routes can detour around terrain — this fixture's leg boundaries can be computed exactly instead
// of guessed at, which is what the precision-sensitive tests below need.
const fastPlane = TerraObject.make({
  kind: 'plane',
  speed: 1,
  source: { lat: 0, lng: 0, height: 0 },
  target: { lat: 0, lng: 30, height: 0 },
  spawnedAt: 0,
});

/**
 * The absolute elapsed-ms instant each of `fastPlane`'s first `legs` re-targets begins, computed by
 * mirroring `engine.ts`'s own `(config.seed, definition.id, leg)`-keyed `pickReachableTarget` call —
 * the same exported reachability helper `engine.ts` uses, not a reimplementation of it — so this
 * fixture stays in lockstep with production rather than duplicating its recurrence.
 */
const planeLegBoundaries = (definition: TerraObject.TerraObject, legs: number): number[] => {
  const domain = TerraObject.domainFor(definition.kind);
  let from: Vec3 = toUnit({ lat: 0, lng: 0 });
  let to: Vec3 = toUnit({ lat: 0, lng: 30 });
  let elapsedMs = 0;
  const boundaries: number[] = [];
  for (let leg = 1; leg <= legs; leg++) {
    elapsedMs += (angleBetween(from, to) / definition.speed) * 1000;
    boundaries.push(elapsedMs);
    from = to;
    to = pickReachableTarget({ grid, domain, from, random: seedrandom(`${config.seed}:${definition.id}:${leg}`) });
  }
  return boundaries;
};

const positionsDiffer = (a: Vec3, b: Vec3): boolean => a[0] !== b[0] || a[1] !== b[1] || a[2] !== b[2];

describe('SimEngine — arrival-driven legs (no stall at arrival)', () => {
  test("a routed object's leg advances exactly when its own route finishes, not on a fixed clock", () => {
    const [arrivalMs] = planeLegBoundaries(fastPlane, 1);
    const engine = new SimEngine({ config, definitions: [fastPlane], grid });

    engine.evaluateAt(Math.max(0, arrivalMs - 50));
    expect(engine.objects[0].state.leg).toBe(0);

    engine.evaluateAt(arrivalMs + 50);
    expect(engine.objects[0].state.leg).toBe(1);
  });

  test('re-targeting never stalls — position keeps changing at every closely-sampled instant across an arrival', () => {
    const [arrivalMs] = planeLegBoundaries(fastPlane, 1);

    // Densely sampled straddling the first arrival, spanning well under a second in total: under the
    // fixed-window bug this recurrence replaces, the object would have sat frozen at the destination
    // for up to a whole 20s window after `arrivalMs` — any frozen stretch found here can only be that
    // bug, not legitimate travel time.
    const offsetsMs = [-40, -10, 10, 40, 90, 160, 260];
    const positions = offsetsMs.map((offset) => {
      const engine = new SimEngine({ config, definitions: [fastPlane], grid });
      engine.evaluateAt(Math.max(0, arrivalMs + offset));
      return engine.objects[0].state.unit;
    });

    for (let index = 1; index < positions.length; index++) {
      expect(positionsDiffer(positions[index - 1], positions[index])).toBe(true);
    }
  });

  test('the same definitions + same final time produce the same destination sequence whether stepped or jumped to directly', () => {
    const boundaries = planeLegBoundaries(fastPlane, 3);
    const finalMs = boundaries[2] + 500;

    const direct = new SimEngine({ config, definitions: [fastPlane], grid });
    direct.evaluateAt(finalMs);

    const stepped = new SimEngine({ config, definitions: [fastPlane], grid });
    for (const at of [
      boundaries[0] / 2,
      boundaries[0] + 50,
      boundaries[1] / 2,
      boundaries[1] + 50,
      boundaries[2] / 2,
    ]) {
      stepped.evaluateAt(at);
    }
    stepped.evaluateAt(finalMs);

    // Three re-targets happened over this span, so this is a meaningful check of the leg sequence,
    // not a vacuous one where leg never left 0 — and well under MAX_CATCHUP_LEGS, so neither path
    // needed the documented catch-up-cap divergence.
    expect(direct.objects[0].state.leg).toBe(3);
    expect(stepped.objects).toEqual(direct.objects);
  });

  test('a peer starting fresh at a later time reproduces the same state as one running continuously', () => {
    const boundaries = planeLegBoundaries(fastPlane, 2);
    const finalMs = boundaries[1] + 300;

    // Simulates a peer that has been rendering continuously since spawn, at roughly a 60fps cadence.
    // The loop lands on whichever 16ms tick is <= finalMs, so the trailing call pins the exact
    // instant being compared — otherwise this would compare two different times, not two paths to
    // the same one.
    const runningSinceStart = new SimEngine({ config, definitions: [fastPlane], grid });
    for (let atMs = 0; atMs <= finalMs; atMs += 16) {
      runningSinceStart.evaluateAt(atMs);
    }
    runningSinceStart.evaluateAt(finalMs);

    // Simulates a peer that opens the same ECHO `Terra` object for the first time at `finalMs`, with
    // no history to replay — the SimEngine constructor always spawns fresh, so this is exactly that.
    const lateJoiner = new SimEngine({ config, definitions: [fastPlane], grid });
    lateJoiner.evaluateAt(finalMs);

    expect(lateJoiner.objects).toEqual(runningSinceStart.objects);
  });
});
