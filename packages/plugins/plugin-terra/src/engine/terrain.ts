//
// Copyright 2026 DXOS.org
//

import { type Vec3 } from './noise.ts';

export type TerrainConfig = {
  radius: number;
  elevationScale: number;
  waterLevel: number;
  landGain: number;
  oceanDepthBias: number;
};

/** Radius of the sea surface, i.e. displacement at exactly the water level. */
export const seaRadius = (config: TerrainConfig): number =>
  config.radius * (1 + config.waterLevel * config.elevationScale);

/** Displaced sphere radius for an elevation, gaining land above and biasing depth below the waterline. */
export const radiusAt = (config: TerrainConfig, elevation: number): number => {
  const rel = elevation - config.waterLevel;
  const shaped = config.waterLevel + (rel >= 0 ? rel * config.landGain : rel * config.oceanDepthBias);
  return config.radius * (1 + shaped * config.elevationScale);
};

/** Latitude in [0, 1] from a unit vector, 0 at the equator and 1 at the poles. */
export const latitude = (unit: Vec3): number => Math.abs(unit[1]);
