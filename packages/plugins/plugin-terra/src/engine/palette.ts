//
// Copyright 2026 DXOS.org
//

import { type Biome } from './biomes.ts';
import { type Vec3 } from './noise.ts';

// Flat NPR palette (linear-ish RGB 0..1), matte.
export const palette: Record<Biome, Vec3> = {
  ocean: [0.13, 0.29, 0.42],
  beach: [0.82, 0.75, 0.53],
  grass: [0.38, 0.56, 0.29],
  forest: [0.22, 0.4, 0.24],
  rock: [0.45, 0.42, 0.4],
  snow: [0.92, 0.94, 0.97],
};

// Depth-shaded sea colour baked into the opaque terrain: shallow reads translucent,
// deep reads dark. This gives the perception of water clarity without a translucent
// dome that would tint emergent land at grazing angles.
const SEA_SHALLOW: Vec3 = [0.28, 0.52, 0.62];
const SEA_DEEP: Vec3 = [0.06, 0.15, 0.31];

export const oceanColor = (elevation: number, waterLevel: number): Vec3 => {
  const depth = Math.min(1, Math.max(0, (waterLevel - elevation) / waterLevel));
  const t = Math.pow(depth, 0.6);
  return [
    SEA_SHALLOW[0] + (SEA_DEEP[0] - SEA_SHALLOW[0]) * t,
    SEA_SHALLOW[1] + (SEA_DEEP[1] - SEA_SHALLOW[1]) * t,
    SEA_SHALLOW[2] + (SEA_DEEP[2] - SEA_SHALLOW[2]) * t,
  ];
};

export const colorFor = (biome: Biome, elevation: number, waterLevel: number): Vec3 =>
  biome === 'ocean' ? oceanColor(elevation, waterLevel) : palette[biome];
