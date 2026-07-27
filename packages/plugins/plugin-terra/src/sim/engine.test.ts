//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { Terra, TerraObject } from '../types';
import { MAX_CATCHUP_WINDOWS, REPLAN_INTERVAL_MS, SimEngine } from './engine';
import { toGeo } from './geo';
import { REPLAN_INTERVAL_SECONDS } from './motion';
import { buildNavGrid, isPassable } from './nav-grid';

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
    const finalMs = 3 * REPLAN_INTERVAL_MS + 15_000;

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

  test("a routed object's windowIndex increments at spawnedAt + n * REPLAN_INTERVAL_MS", () => {
    const engine = new SimEngine({ config, definitions: [boat], grid });

    engine.evaluateAt(REPLAN_INTERVAL_MS - 1);
    expect(engine.objects[0].state.windowIndex).toBe(0);

    engine.evaluateAt(REPLAN_INTERVAL_MS);
    expect(engine.objects[0].state.windowIndex).toBe(1);

    engine.evaluateAt(2 * REPLAN_INTERVAL_MS + 500);
    expect(engine.objects[0].state.windowIndex).toBe(2);
  });

  test('reset() restores initial state', () => {
    const engine = new SimEngine({ config, definitions, grid });
    const initial = engine.objects;
    engine.evaluateAt(50_000);
    expect(engine.objects).not.toEqual(initial);
    engine.reset();
    expect(engine.objects).toEqual(initial);
  });

  test('a closed-form kind (satellite) never advances windows', () => {
    const engine = new SimEngine({ config, definitions: [satellite], grid });
    engine.evaluateAt(10 * REPLAN_INTERVAL_MS);
    expect(engine.objects[0].state.windowIndex).toBe(0);
  });

  test('REPLAN_INTERVAL_MS is derived from motion.REPLAN_INTERVAL_SECONDS, not redefined', () => {
    expect(REPLAN_INTERVAL_MS).toBe(REPLAN_INTERVAL_SECONDS * 1000);
  });

  test('a long gap beyond MAX_CATCHUP_WINDOWS still settles without throwing', () => {
    const engine = new SimEngine({ config, definitions: [boat], grid });
    const farMs = (MAX_CATCHUP_WINDOWS + 20) * REPLAN_INTERVAL_MS;
    expect(() => engine.evaluateAt(farMs)).not.toThrow();
    expect(engine.objects[0].state.windowIndex).toBe(Math.floor(farMs / REPLAN_INTERVAL_MS));
  });
});

// An absurdly fast tank: covers any route the grid can produce (at most a few radians) within a
// single 20s window regardless of path length, so arrival is guaranteed by every window boundary —
// which is what these tests need to exercise re-targeting deterministically rather than depending
// on the fixture's actual (unpredictable) route length.
const fastTank = TerraObject.make({
  kind: 'tank',
  speed: 5,
  source: { ...tankSource, height: 0 },
  target: { ...tankTarget, height: 0 },
  spawnedAt: 0,
});

describe('SimEngine — re-targeting on arrival (the property Feature 1 adds)', () => {
  test('an object that reaches its target gets a new one and keeps moving', () => {
    const engine = new SimEngine({ config, definitions: [fastTank], grid });

    engine.evaluateAt(REPLAN_INTERVAL_MS);
    const afterWindow1 = engine.objects[0].state;
    // Arrived well inside window 0, so by its end the recurrence must have already moved on to a new leg.
    expect(afterWindow1.leg).toBeGreaterThan(0);

    engine.evaluateAt(2 * REPLAN_INTERVAL_MS);
    const afterWindow2 = engine.objects[0].state;
    expect(afterWindow2.leg).toBeGreaterThan(afterWindow1.leg);

    const moved =
      afterWindow1.unit[0] !== afterWindow2.unit[0] ||
      afterWindow1.unit[1] !== afterWindow2.unit[1] ||
      afterWindow1.unit[2] !== afterWindow2.unit[2];
    expect(moved).toBe(true);
  });

  test('the same definitions + same final time produce the same destination sequence whether stepped or jumped to directly', () => {
    const finalMs = 6 * REPLAN_INTERVAL_MS + 7_000;

    const direct = new SimEngine({ config, definitions: [fastTank], grid });
    direct.evaluateAt(finalMs);

    const stepped = new SimEngine({ config, definitions: [fastTank], grid });
    for (const at of [1_000, 5_500, 20_000, 33_000, 50_000, 80_000, 100_000]) {
      stepped.evaluateAt(at);
    }
    stepped.evaluateAt(finalMs);

    // Several re-targets happened over this span, so this is a meaningful check of the leg
    // sequence, not a vacuous one where leg never left 0.
    expect(direct.objects[0].state.leg).toBeGreaterThan(1);
    expect(stepped.objects).toEqual(direct.objects);
  });

  test('a peer starting fresh at a later time reproduces the same state as one running continuously', () => {
    const finalMs = 5 * REPLAN_INTERVAL_MS + 12_000;

    // Simulates a peer that has been rendering continuously since spawn, at roughly a 60fps cadence.
    const runningSinceStart = new SimEngine({ config, definitions: [fastTank], grid });
    for (let atMs = 0; atMs <= finalMs; atMs += 16) {
      runningSinceStart.evaluateAt(atMs);
    }

    // Simulates a peer that opens the same ECHO `Terra` object for the first time at `finalMs`, with
    // no history to replay — the SimEngine constructor always spawns fresh, so this is exactly that.
    const lateJoiner = new SimEngine({ config, definitions: [fastTank], grid });
    lateJoiner.evaluateAt(finalMs);

    expect(lateJoiner.objects).toEqual(runningSinceStart.objects);
  });
});
