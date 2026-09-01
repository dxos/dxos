//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { Terra } from '#types';

import { angleBetween } from './geo.ts';
import { buildNavGrid, isPassable } from './nav-grid.ts';

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
