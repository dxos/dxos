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

/** Deterministic seeded fBm sampler over the unit sphere (seamless: sampled in 3D). */
export const makeSampler = (config: NoiseConfig) => {
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
