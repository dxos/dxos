//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { makeSampler, type NoiseConfig } from './noise';

const config: NoiseConfig = {
  seed: 'terra-1',
  frequency: 0.9,
  octaves: 6,
  persistence: 0.5,
  lacunarity: 2.0,
  continentPower: 1.35,
  waterLevel: 0.46,
  mountainScale: 0.5,
  maskFrequency: 0.9,
  maskThreshold: 0.42,
};

describe('noise', () => {
  test('is deterministic for a seed', () => {
    const a = makeSampler(config);
    const b = makeSampler(config);
    expect(a.elevation([0.1, 0.2, 0.97])).toBe(b.elevation([0.1, 0.2, 0.97]));
  });

  test('different seeds differ', () => {
    const a = makeSampler(config);
    const b = makeSampler({ ...config, seed: 'terra-2' });
    expect(a.elevation([0.1, 0.2, 0.97])).not.toBe(b.elevation([0.1, 0.2, 0.97]));
  });

  test('elevation is non-negative; moisture is in [0, 1]', () => {
    const { elevation, moisture } = makeSampler(config);
    for (const point of [
      [1, 0, 0],
      [0, 1, 0],
      [0.3, -0.4, 0.86],
    ] as const) {
      expect(elevation(point)).toBeGreaterThanOrEqual(0); // may exceed 1 for mountains.
      expect(moisture(point)).toBeGreaterThanOrEqual(0);
      expect(moisture(point)).toBeLessThanOrEqual(1);
    }
  });
});
