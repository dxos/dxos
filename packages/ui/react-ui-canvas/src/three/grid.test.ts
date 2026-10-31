//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { AXIS_COLORS, GRID_MAJOR_EVERY, groundAxes, groundGrid } from './grid.ts';

describe('groundGrid', () => {
  const grid = groundGrid({ extent: 8, majorEvery: GRID_MAJOR_EVERY });

  test('every fourth line is a major line, as the 2D canvas grid', () => {
    expect(GRID_MAJOR_EVERY).toBe(4);
    const major = grid.lines.filter((line) => line.major).map((line) => line.offset);
    expect(new Set(major)).toEqual(new Set([-8, -4, 0, 4, 8]));
  });

  test('minor lines are fainter than major ones, and every line is faint', () => {
    const at = (offset: number) => grid.lines.find((line) => line.offset === offset && line.axis === 'x');
    expect(at(1)?.alpha).toBeLessThan(at(0)?.alpha ?? 0);
    for (const line of grid.lines) {
      expect(line.alpha).toBeGreaterThan(0);
      expect(line.alpha).toBeLessThanOrEqual(0.35);
    }
  });

  test('lines fade towards the edge of the grid', () => {
    const at = (offset: number) => grid.lines.find((line) => line.offset === offset && line.axis === 'x')?.alpha ?? 0;
    expect(at(8)).toBeLessThan(at(0));
    expect(at(4)).toBeLessThan(at(0));
  });
});

describe('groundAxes', () => {
  const axes = groundAxes(8);

  test('one line per axis, coloured x red, y green, z blue', () => {
    expect(axes.map(({ axis }) => axis)).toEqual(['x', 'y', 'z']);
    expect(axes.map(({ color }) => color)).toEqual([AXIS_COLORS.x, AXIS_COLORS.y, AXIS_COLORS.z]);
  });

  test('x and z span the grid; y rises from the ground', () => {
    const [x, y, z] = axes;
    expect([x.from[0], x.to[0]]).toEqual([-8, 8]);
    expect([z.from[2], z.to[2]]).toEqual([-8, 8]);
    expect([y.from[1], y.to[1]]).toEqual([0, 8]);
  });

  test('the ground axes sit just above the grid, so its centre lines do not hide them', () => {
    const [x, , z] = axes;
    expect(x.from[1]).toBeGreaterThan(0);
    expect(z.from[1]).toBeGreaterThan(0);
  });
});
