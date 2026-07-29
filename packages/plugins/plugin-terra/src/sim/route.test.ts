//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { Terra } from '../types';
import { toUnit } from './geo';
import { buildNavGrid, isPassable } from './nav-grid';
import { domainCandidates } from './reachable';
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

  test('a land route stays on passable ground for its whole length', () => {
    // Endpoints come from `domainCandidates` rather than `landCells`: two arbitrary passable land
    // cells can sit on different continents, where no route exists at all and the assertion below
    // would vacuously pass. `domainCandidates` returns one connected component, so a route must exist.
    const candidates = domainCandidates(grid, 'land');
    const from = candidates[0].unit;
    const to = candidates[candidates.length - 1].unit;
    const waypoints = planRoute({ grid, domain: 'land', from, to });
    expect(waypoints.length).toBeGreaterThan(0);
    for (const waypoint of waypoints) {
      expect(isPassable(grid, grid.findNearest(waypoint), 'land')).toBe(true);
    }
  });

  test('air routes ignore terrain below the cruise elevation', () => {
    const from = toUnit({ lat: 10, lng: 10 });
    const to = toUnit({ lat: -20, lng: 140 });
    expect(planRoute({ grid, domain: 'air', from, to }).length).toBeGreaterThan(0);
  });
});
