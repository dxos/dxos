//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { detentOf, magnetTo, snapTo } from './snap.ts';

describe('snap', () => {
  test('detentOf holds a value on its snapped place within the detent and leaves it otherwise', ({ expect }) => {
    expect(detentOf(1.9, 2, 0.2)).toBe(2);
    expect(detentOf(1.7, 2, 0.2)).toBe(1.7);
  });

  test('snapTo lands on the nearest whole step; a zero step leaves the value', ({ expect }) => {
    expect(snapTo(1.3, 0.5)).toBe(1.5);
    expect(snapTo(-0.8, 1)).toBe(-1);
    expect(snapTo(1.3, 0)).toBe(1.3);
  });

  test('magnetTo follows the value but holds it on a step it passes within the detent', ({ expect }) => {
    expect(magnetTo(1.95, 1, 0.1)).toBe(2);
    expect(magnetTo(1.6, 1, 0.1)).toBe(1.6);
    expect(magnetTo(1.6, 0, 0.1)).toBe(1.6);
  });
});
