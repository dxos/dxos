//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { GRID_MAJOR_EVERY, groundGrid } from './grid.ts';

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
