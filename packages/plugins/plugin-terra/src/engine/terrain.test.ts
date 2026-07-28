//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { type TerrainConfig, latitude, radiusAt, seaRadius } from './terrain';

const config: TerrainConfig = {
  radius: 2,
  elevationScale: 0.16,
  waterLevel: 0.44,
  landGain: 2.8,
  oceanDepthBias: 0.6,
};

describe('terrain', () => {
  test('land rises above the sea surface', () => {
    const sea = seaRadius(config);
    expect(radiusAt(config, 0.7)).toBeGreaterThan(sea); // elevation > waterLevel
  });

  test('ocean floor sits below the sea surface', () => {
    const sea = seaRadius(config);
    expect(radiusAt(config, 0.2)).toBeLessThan(sea); // elevation < waterLevel
  });

  test('sea surface equals radiusAt(waterLevel)', () => {
    expect(radiusAt(config, config.waterLevel)).toBeCloseTo(seaRadius(config), 9);
  });

  test('latitude is 1 at the pole and 0 at the equator', () => {
    expect(latitude([0, 1, 0])).toBeCloseTo(1, 9);
    expect(latitude([1, 0, 0])).toBeCloseTo(0, 9);
  });
});
