//
// Copyright 2026 DXOS.org
//

export type Biome = 'ocean' | 'beach' | 'grass' | 'forest' | 'rock' | 'snow';

export type ClimateConfig = {
  waterLevel: number;
  beachWidth: number;
  treeLine: number;
  poles: boolean; // latitude-based ice caps.
  snowLine: number; // absolute latitude 0..1 (poles = 1).
  snowElevation: number;
};

export const classify = (
  config: ClimateConfig,
  elevation: number,
  latitude: number, // 0..1 (abs y).
  moisture: number,
): Biome => {
  if (elevation < config.waterLevel) {
    return 'ocean';
  }
  const rel = (elevation - config.waterLevel) / (1 - config.waterLevel);
  // Elevation snow (mountain peaks) always; latitude ice caps only when poles enabled.
  if ((config.poles && latitude > config.snowLine) || rel > config.snowElevation) {
    return 'snow';
  }
  if (rel < config.beachWidth) {
    return 'beach';
  }
  if (rel > config.treeLine) {
    return 'rock';
  }
  return moisture > 0.5 ? 'forest' : 'grass';
};
