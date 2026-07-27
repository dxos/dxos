//
// Terra spike — engine-agnostic planet generation.
// Deterministic from a seed; produces triangle-soup geometry (flat shaded)
// plus scatter placements. No Babylon imports here so it stays portable/testable.
//

import { createNoise3D } from 'simplex-noise';
import seedrandom from 'seedrandom';

export type Vec3 = [number, number, number];

export type TerraConfig = {
  seed: string;
  radius: number;
  resolution: number; // subdivisions per cube face edge
  // Terrain.
  elevationScale: number; // relief as fraction of radius
  frequency: number;
  octaves: number;
  persistence: number;
  lacunarity: number;
  continentPower: number; // >1 flattens lowlands into oceans, sharpens continents
  landGain: number; // relief multiplier above the waterline (continents rise clearly)
  // Water.
  waterLevel: number; // 0..1 in elevation space
  // Climate (all relative-height 0..1 unless noted).
  beachWidth: number;
  treeLine: number;
  snowLine: number; // absolute latitude 0..1 (poles = 1)
  snowElevation: number;
  // Scatter.
  treeDensity: number; // 0..1 probability per eligible face
  rockDensity: number;
};

export const defaultConfig = (seed = 'terra'): TerraConfig => ({
  seed,
  radius: 2,
  resolution: 512,
  elevationScale: 0.16,
  frequency: 1.6,
  octaves: 6,
  persistence: 0.5,
  lacunarity: 2.0,
  continentPower: 1.15,
  landGain: 2.5,
  waterLevel: 0.44,
  beachWidth: 0.05,
  treeLine: 0.55,
  snowLine: 0.82,
  snowElevation: 0.78,
  treeDensity: 0.28,
  rockDensity: 0.1,
});

export type Biome = 'ocean' | 'beach' | 'grass' | 'forest' | 'rock' | 'snow';

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
const oceanColor = (elevation: number, waterLevel: number): Vec3 => {
  const depth = Math.min(1, Math.max(0, (waterLevel - elevation) / waterLevel));
  const t = Math.pow(depth, 0.6);
  return [
    SEA_SHALLOW[0] + (SEA_DEEP[0] - SEA_SHALLOW[0]) * t,
    SEA_SHALLOW[1] + (SEA_DEEP[1] - SEA_SHALLOW[1]) * t,
    SEA_SHALLOW[2] + (SEA_DEEP[2] - SEA_SHALLOW[2]) * t,
  ];
};

// Six cube faces via local-up basis (Sebastian Lague style).
const FACE_UPS: Vec3[] = [
  [0, 1, 0],
  [0, -1, 0],
  [1, 0, 0],
  [-1, 0, 0],
  [0, 0, 1],
  [0, 0, -1],
];

const normalize = (v: Vec3): Vec3 => {
  const len = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / len, v[1] / len, v[2] / len];
};
const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const scale = (a: Vec3, s: number): Vec3 => [a[0] * s, a[1] * s, a[2] * s];

/** Deterministic seeded fBm sampler over the unit sphere (seamless: sampled in 3D). */
export const makeSampler = (config: TerraConfig) => {
  const rng = seedrandom(config.seed);
  const elevationNoise = createNoise3D(rng);
  const moistureNoise = createNoise3D(rng);

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

  // Elevation in [0, 1]; continentPower biases toward oceans/continents.
  const elevation = (unit: Vec3): number => {
    const raw = (fbm(elevationNoise, unit, config.frequency) + 1) / 2;
    return Math.pow(raw, config.continentPower);
  };
  const moisture = (unit: Vec3): number => (fbm(moistureNoise, unit, config.frequency * 0.7) + 1) / 2;

  return { elevation, moisture };
};

export const classify = (
  config: TerraConfig,
  elevation: number,
  latitude: number, // 0..1 (abs y)
  moisture: number,
): Biome => {
  if (elevation < config.waterLevel) return 'ocean';
  const rel = (elevation - config.waterLevel) / (1 - config.waterLevel);
  if (latitude > config.snowLine || rel > config.snowElevation) return 'snow';
  if (rel < config.beachWidth) return 'beach';
  if (rel > config.treeLine) return 'rock';
  return moisture > 0.5 ? 'forest' : 'grass';
};

export type PlanetMesh = {
  positions: Float32Array;
  normals: Float32Array;
  colors: Float32Array; // rgba
};

export type Scatter = {
  position: Vec3;
  normal: Vec3;
  type: 'tree' | 'rock';
  scale: number;
  variant: number; // 0..5
  tint: number; // -1..1 colour jitter
};

export type Planet = {
  mesh: PlanetMesh;
  scatter: Scatter[];
  seaRadius: number;
  config: TerraConfig;
};

export const generatePlanet = (config: TerraConfig): Planet => {
  const { elevation, moisture } = makeSampler(config);
  const res = config.resolution;
  const seaRadius = config.radius * (1 + config.waterLevel * config.elevationScale);
  const scatterRng = seedrandom(config.seed + ':scatter');

  // Land above the waterline rises by landGain; ocean floor dips gently below it.
  const radiusAt = (unit: Vec3): number => {
    const rel = elevation(unit) - config.waterLevel;
    const shaped = config.waterLevel + (rel >= 0 ? rel * config.landGain : rel * 0.6);
    return config.radius * (1 + shaped * config.elevationScale);
  };

  const positions: number[] = [];
  const normals: number[] = [];
  const colors: number[] = [];
  const scatter: Scatter[] = [];

  const pushTri = (a: Vec3, b: Vec3, c: Vec3, color: Vec3) => {
    // Outward-facing normal.
    let n = normalize(cross(sub(b, a), sub(c, a)));
    const centroid = scale([a[0] + b[0] + c[0], a[1] + b[1] + c[1], a[2] + b[2] + c[2]], 1 / 3);
    if (dot(n, centroid) < 0) {
      n = scale(n, -1);
      [b, c] = [c, b];
    }
    for (const v of [a, b, c]) {
      positions.push(v[0], v[1], v[2]);
      normals.push(n[0], n[1], n[2]);
      colors.push(color[0], color[1], color[2], 1);
    }
  };

  for (const up of FACE_UPS) {
    const axisA: Vec3 = [up[1], up[2], up[0]];
    const axisB = cross(up, axisA);

    const unitAt = (i: number, j: number): Vec3 => {
      const px = (i / res) * 2 - 1;
      const py = (j / res) * 2 - 1;
      return normalize([
        up[0] + px * axisA[0] + py * axisB[0],
        up[1] + px * axisA[1] + py * axisB[1],
        up[2] + px * axisA[2] + py * axisB[2],
      ]);
    };
    const worldAt = (unit: Vec3): Vec3 => scale(unit, radiusAt(unit));

    for (let i = 0; i < res; i++) {
      for (let j = 0; j < res; j++) {
        const u00 = unitAt(i, j);
        const u10 = unitAt(i + 1, j);
        const u11 = unitAt(i + 1, j + 1);
        const u01 = unitAt(i, j + 1);
        const p00 = worldAt(u00);
        const p10 = worldAt(u10);
        const p11 = worldAt(u11);
        const p01 = worldAt(u01);

        // Per-face biome from the quad centre (flat, low-poly colour).
        const cUnit = normalize([
          u00[0] + u10[0] + u11[0] + u01[0],
          u00[1] + u10[1] + u11[1] + u01[1],
          u00[2] + u10[2] + u11[2] + u01[2],
        ]);
        const elev = elevation(cUnit);
        const lat = Math.abs(cUnit[1]);
        const moist = moisture(cUnit);
        const biome = classify(config, elev, lat, moist);
        const color = biome === 'ocean' ? oceanColor(elev, config.waterLevel) : palette[biome];

        pushTri(p00, p11, p10, color);
        pushTri(p00, p01, p11, color);

        // Scatter on eligible land faces.
        if (biome === 'grass' || biome === 'forest' || biome === 'rock') {
          const roll = scatterRng();
          const density = biome === 'rock' ? config.rockDensity : config.treeDensity;
          if (roll < density) {
            const cWorld = scale(cUnit, radiusAt(cUnit));
            scatter.push({
              position: cWorld,
              normal: normalize(cUnit),
              type: biome === 'rock' ? 'rock' : 'tree',
              scale: 0.6 + scatterRng() * 0.8,
              variant: Math.floor(scatterRng() * 6),
              tint: (scatterRng() - 0.5) * 0.4,
            });
          }
        }
      }
    }
  }

  return {
    mesh: {
      positions: new Float32Array(positions),
      normals: new Float32Array(normals),
      colors: new Float32Array(colors),
    },
    scatter,
    seaRadius,
    config,
  };
};
