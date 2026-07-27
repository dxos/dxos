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
