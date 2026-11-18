//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { packSpaces } from './substrate-packing.ts';

const SETTINGS = { seed: 29, spaceCount: 9, rmin: 34, rmax: 150, gap: 10 };
const BOX = { width: 816, height: 824 };

describe('substrate packing', () => {
  test('a field packs its spaces from its seed, so the text need not carry them', ({ expect }) => {
    // The packing is the rule; the stored `spaces` are its cached result. A drawing written down as text keeps the
    // rule and loses the cache, and before this the field fell back to a single space — which is what emptied the
    // Hyperspace slide's hexagon on every rebuild.
    const packed = packSpaces(SETTINGS, BOX.width, BOX.height);
    expect(packed).toHaveLength(SETTINGS.spaceCount);
    expect(packSpaces(SETTINGS, BOX.width, BOX.height)).toEqual(packed);
    expect(packSpaces({ ...SETTINGS, seed: 30 }, BOX.width, BOX.height)).not.toEqual(packed);
  });

  test('no two spaces overlap, and none crosses the field edge', ({ expect }) => {
    const packed = packSpaces(SETTINGS, BOX.width, BOX.height).map(({ x, y, r }) => ({
      x: x * BOX.width,
      y: y * BOX.height,
      r: r * BOX.width,
    }));
    for (const [index, space] of packed.entries()) {
      expect(space.x - space.r).toBeGreaterThanOrEqual(SETTINGS.gap - 0.001);
      expect(space.y - space.r).toBeGreaterThanOrEqual(SETTINGS.gap - 0.001);
      expect(space.x + space.r).toBeLessThanOrEqual(BOX.width - SETTINGS.gap + 0.001);
      expect(space.y + space.r).toBeLessThanOrEqual(BOX.height - SETTINGS.gap + 0.001);
      for (const other of packed.slice(index + 1)) {
        expect(Math.hypot(other.x - space.x, other.y - space.y)).toBeGreaterThanOrEqual(
          space.r + other.r + SETTINGS.gap - 0.001,
        );
      }
    }
  });

  test('a field whose radii cannot fit shows fewer spaces rather than overlapping ones', ({ expect }) => {
    // Not placing a space is the deliberate outcome: an overlapping pair reads as one blob and hides the defect.
    expect(packSpaces({ ...SETTINGS, spaceCount: 40, rmin: 150, rmax: 150 }, 400, 400).length).toBeLessThan(40);
  });
});
