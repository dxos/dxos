//
// Copyright 2026 DXOS.org
//

import seedrandom from 'seedrandom';
import { createNoise3D } from 'simplex-noise';

export type Vec3 = readonly [number, number, number];

export type NoiseConfig = {
  seed: string;
  frequency: number;
  octaves: number;
  persistence: number;
  lacunarity: number;
  continentPower: number; // >1 flattens lowlands into oceans, sharpens continents.
  waterLevel: number; // 0..1 in elevation space.
  mountainScale: number; // extra elevation added inside mountain belts (0 = none).
  maskFrequency: number; // low → large, few mountain belts.
  maskThreshold: number; // 0..1; higher → mountains confined to fewer, tighter belts.
};

const smoothstep = (edge0: number, edge1: number, x: number): number => {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
};

/** Elevation and moisture over the unit sphere, both pure functions of the config the sampler was built from. */
export type Sampler = {
  elevation: (unit: Vec3) => number;
  moisture: (unit: Vec3) => number;
};

const buildSampler = (config: NoiseConfig): Sampler => {
  const rng = seedrandom(config.seed);
  const elevationNoise = createNoise3D(rng);
  const moistureNoise = createNoise3D(rng);
  const maskNoise = createNoise3D(rng);
  const ridgeNoise = createNoise3D(rng);

  const fbm = (noise: (x: number, y: number, z: number) => number, p: Vec3, freq: number): number => {
    let amp = 1;
    let f = freq;
    let sum = 0;
    let norm = 0;
    for (let o = 0; o < config.octaves; o++) {
      sum += amp * noise(p[0] * f, p[1] * f, p[2] * f);
      norm += amp;
      amp *= config.persistence;
      f *= config.lacunarity;
    }
    return sum / norm; // [-1, 1]
  };

  // Ridged multifractal: sharp crests (mountain ridges) rather than rolling hills.
  const ridged = (p: Vec3, freq: number): number => {
    let amp = 1;
    let f = freq;
    let sum = 0;
    let norm = 0;
    for (let o = 0; o < config.octaves; o++) {
      const value = 1 - Math.abs(ridgeNoise(p[0] * f, p[1] * f, p[2] * f));
      sum += amp * value * value;
      norm += amp;
      amp *= config.persistence;
      f *= config.lacunarity;
    }
    return sum / norm; // [0, 1]
  };

  // Elevation in [0, ∞): low-frequency continents (ocean-biased) plus ridged mountains
  // confined to belts by a low-frequency mask, and only rising on land.
  const elevation = (unit: Vec3): number => {
    const base = Math.pow((fbm(elevationNoise, unit, config.frequency) + 1) / 2, config.continentPower);
    const maskRaw = (fbm(maskNoise, unit, config.maskFrequency) + 1) / 2;
    const belt = smoothstep(config.maskThreshold, 1, maskRaw);
    const onLand = smoothstep(config.waterLevel - 0.02, config.waterLevel + 0.12, base);
    const mountains = belt * onLand * ridged(unit, config.frequency * 3) * config.mountainScale;
    // No upper clamp: clamping flattens tall peaks into plateaus. Elevation may exceed 1
    // for mountains; biome thresholds and displacement handle the extended range.
    return base + mountains;
  };

  const moisture = (unit: Vec3): number => (fbm(moistureNoise, unit, config.frequency * 0.7) + 1) / 2;

  return { elevation, moisture };
};

/** Every field the noise closes over, so two configs sharing a key produce bit-identical samples. */
const cacheKey = (config: NoiseConfig): string =>
  [
    config.seed,
    config.frequency,
    config.octaves,
    config.persistence,
    config.lacunarity,
    config.continentPower,
    config.waterLevel,
    config.mountainScale,
    config.maskFrequency,
    config.maskThreshold,
  ].join('|');

/** Small enough that a slider drag cannot leak samplers, large enough that terrain and sim configs coexist. */
const SAMPLER_CACHE_LIMIT = 4;

const samplerCache = new Map<string, Sampler>();

/**
 * Deterministic seeded fBm sampler over the unit sphere (seamless: sampled in 3D), memoized on the
 * config's noise fields. Building one seeds four simplex permutation tables — negligible once, but
 * `sim/motion.ts` builds a sampler inside `evaluate`, which the smoke trails call ~25 times per
 * object per frame; uncached, that construction alone cost ~26ms/frame at 20 objects and timed the
 * `Objects` story out in CI. Memoizing is semantically invisible: a sampler is a pure function of
 * its config.
 */
export const makeSampler = (config: NoiseConfig): Sampler => {
  const key = cacheKey(config);
  const cached = samplerCache.get(key);
  if (cached) {
    return cached;
  }

  const sampler = buildSampler(config);
  if (samplerCache.size >= SAMPLER_CACHE_LIMIT) {
    // Map iterates in insertion order, so the first key is the oldest.
    const oldest = samplerCache.keys().next();
    if (!oldest.done) {
      samplerCache.delete(oldest.value);
    }
  }
  samplerCache.set(key, sampler);
  return sampler;
};
