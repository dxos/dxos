//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { cloudPath } from './cloud.ts';

describe('cloudPath', () => {
  test('a closed ring of arcs whose ends lie inside the inset frame', ({ expect }) => {
    const size = { width: 300, height: 200 };
    const inset = 4;
    const d = cloudPath(size, inset);
    expect(d.startsWith('M ')).toBe(true);
    expect(d.endsWith(' Z')).toBe(true);
    const arcs = [...d.matchAll(/A ([\d.]+) [\d.]+ 0 [01] 1 ([\d.-]+) ([\d.-]+)/g)];
    expect(arcs).toHaveLength(9);
    for (const [, radius, x, y] of arcs) {
      expect(Number(radius)).toBeGreaterThan(0);
      expect(Number(x)).toBeGreaterThan(inset);
      expect(Number(x)).toBeLessThan(size.width - inset);
      expect(Number(y)).toBeGreaterThan(inset);
      expect(Number(y)).toBeLessThan(size.height - inset);
    }
  });

  test('scales with the frame', () => {
    expect(cloudPath({ width: 100, height: 100 })).not.toEqual(cloudPath({ width: 200, height: 100 }));
  });
});
