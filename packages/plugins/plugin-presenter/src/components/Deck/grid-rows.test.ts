//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { moveByRow } from './grid-rows.ts';

describe('moveByRow', () => {
  test('moves a whole row within the grid', ({ expect }) => {
    expect(moveByRow(1, 10, 4, 1)).toBe(5);
    expect(moveByRow(5, 10, 4, -1)).toBe(1);
  });

  test('stays put with no row to move to', ({ expect }) => {
    expect(moveByRow(2, 10, 4, -1)).toBe(2);
    expect(moveByRow(9, 10, 4, 1)).toBe(9);
    expect(moveByRow(2, 4, 4, 1)).toBe(2);
    expect(moveByRow(2, 4, 4, -1)).toBe(2);
  });

  test('lands on the last slide when the row below is too short for the column', ({ expect }) => {
    expect(moveByRow(3, 6, 4, 1)).toBe(5);
    expect(moveByRow(2, 6, 4, 1)).toBe(5);
    expect(moveByRow(1, 6, 4, 1)).toBe(5);
  });

  test('moves one slide in a single column', ({ expect }) => {
    expect(moveByRow(0, 3, 1, 1)).toBe(1);
    expect(moveByRow(2, 3, 1, 1)).toBe(2);
  });
});
