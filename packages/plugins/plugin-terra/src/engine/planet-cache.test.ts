//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { type TerraConfigValues } from './generate-planet';
import { PlanetCache, planetKey } from './planet-cache';

const config: TerraConfigValues = {
  seed: 'terra-1',
  radius: 2,
  resolution: 8,
  elevationScale: 0.16,
  frequency: 0.9,
  octaves: 6,
  persistence: 0.5,
  lacunarity: 2.0,
  continentPower: 1.35,
  mountainScale: 0.5,
  maskFrequency: 0.9,
  maskThreshold: 0.42,
  waterLevel: 0.46,
  landGain: 2.5,
  oceanDepthBias: 0.6,
  beachWidth: 0.05,
  treeLine: 0.55,
  poles: false,
  snowLine: 0.82,
  snowElevation: 0.78,
  treeDensity: 0.28,
  rockDensity: 0.1,
  trees: true,
  rocks: true,
};

/** One planet's retained size, for budgets expressed in whole entries. */
const planetBytes = (): number => {
  const cache = new PlanetCache();
  cache.resolve(config);
  return cache.bytes;
};

describe('planetKey', () => {
  test('is independent of key order', ({ expect }) => {
    const { seed, radius, ...rest } = config;
    expect(planetKey({ ...rest, radius, seed })).toBe(planetKey(config));
  });

  test('distinguishes configs that generate different planets', ({ expect }) => {
    expect(planetKey({ ...config, seed: 'terra-2' })).not.toBe(planetKey(config));
    expect(planetKey({ ...config, trees: false })).not.toBe(planetKey(config));
  });
});

describe('PlanetCache', () => {
  test('holds nothing before the planet has been generated', ({ expect }) => {
    const cache = new PlanetCache();
    expect(cache.has(config)).toBe(false);
    expect(cache.size).toBe(0);
  });

  test('reuses the generated planet for an equivalent config', ({ expect }) => {
    const cache = new PlanetCache();
    const planet = cache.resolve(config);
    expect(cache.has({ ...config })).toBe(true);
    expect(cache.resolve({ ...config })).toBe(planet);
    expect(cache.size).toBe(1);
    expect(cache.misses).toBe(1);
    expect(cache.hits).toBe(1);
  });

  test('generates a distinct planet per config', ({ expect }) => {
    const cache = new PlanetCache();
    const planet = cache.resolve(config);
    expect(cache.resolve({ ...config, seed: 'terra-2' })).not.toBe(planet);
    expect(cache.size).toBe(2);
    expect(cache.misses).toBe(2);
  });

  test('evicts the least recently used planet once over budget', ({ expect }) => {
    const cache = new PlanetCache({ maxBytes: planetBytes() * 2 });
    const first = cache.resolve(config);
    cache.resolve({ ...config, seed: 'terra-2' });
    // Re-resolving `first` makes the second entry the least recent, so it is the one dropped.
    expect(cache.resolve(config)).toBe(first);
    cache.resolve({ ...config, seed: 'terra-3' });
    expect(cache.size).toBe(2);
    expect(cache.has(config)).toBe(true);
    expect(cache.has({ ...config, seed: 'terra-2' })).toBe(false);
  });

  test('retains a single planet larger than the budget', ({ expect }) => {
    const cache = new PlanetCache({ maxBytes: 1 });
    const planet = cache.resolve(config);
    expect(cache.resolve(config)).toBe(planet);
    expect(cache.size).toBe(1);
  });

  test('clear drops everything', ({ expect }) => {
    const cache = new PlanetCache();
    cache.resolve(config);
    cache.clear();
    expect(cache.size).toBe(0);
    expect(cache.bytes).toBe(0);
    expect(cache.has(config)).toBe(false);
  });
});
