//
// Copyright 2026 DXOS.org
//

import seedrandom from 'seedrandom';

import { type ClimateConfig, classify } from './biomes.ts';
import { FACE_UPS, add, cross, dot, faceBasis, normalize, scale, sub, unitOnFace } from './cubed-sphere.ts';
import { type NoiseConfig, type Vec3, makeSampler } from './noise.ts';
import { colorFor } from './palette.ts';
import { type TerrainConfig, radiusAt, seaRadius as seaRadiusOf } from './terrain.ts';

export type TerraConfigValues = NoiseConfig &
  TerrainConfig &
  ClimateConfig & {
    resolution: number; // subdivisions per cube face edge.
    treeDensity: number; // 0..1 probability per eligible face.
    rockDensity: number;
    trees: boolean;
    rocks: boolean;
  };

export type PlanetMesh = {
  positions: Float32Array;
  normals: Float32Array;
  colors: Float32Array; // rgba.
};

export type Scatter = {
  position: Vec3;
  normal: Vec3;
  type: 'tree' | 'rock';
  scale: number;
  variant: number; // 0..5.
  tint: number; // -1..1 colour jitter.
};

export type Planet = {
  mesh: PlanetMesh;
  scatter: Scatter[];
  seaRadius: number;
};

/** Assembles the cubed-sphere mesh (triangle soup, flat shaded) and deterministic scatter placements. */
export const generatePlanet = (config: TerraConfigValues): Planet => {
  const { elevation, moisture } = makeSampler(config);
  const resolution = config.resolution;
  const scatterRng = seedrandom(config.seed + ':scatter');

  const positions: number[] = [];
  const normals: number[] = [];
  const colors: number[] = [];
  const scatter: Scatter[] = [];

  const worldAt = (unit: Vec3): Vec3 => scale(unit, radiusAt(config, elevation(unit)));

  // Flat-shaded triangle: outward normal, winding flipped if it points inward.
  const pushTri = (a: Vec3, b: Vec3, c: Vec3, color: Vec3): void => {
    let n = normalize(cross(sub(b, a), sub(c, a)));
    const centroid = scale(add(add(a, b), c), 1 / 3);
    let vb = b;
    let vc = c;
    if (dot(n, centroid) < 0) {
      n = scale(n, -1);
      vb = c;
      vc = b;
    }
    for (const v of [a, vb, vc]) {
      positions.push(v[0], v[1], v[2]);
      normals.push(n[0], n[1], n[2]);
      colors.push(color[0], color[1], color[2], 1);
    }
  };

  for (const up of FACE_UPS) {
    const { axisA, axisB } = faceBasis(up);

    for (let i = 0; i < resolution; i++) {
      for (let j = 0; j < resolution; j++) {
        const u00 = unitOnFace(up, axisA, axisB, i, j, resolution);
        const u10 = unitOnFace(up, axisA, axisB, i + 1, j, resolution);
        const u11 = unitOnFace(up, axisA, axisB, i + 1, j + 1, resolution);
        const u01 = unitOnFace(up, axisA, axisB, i, j + 1, resolution);
        const p00 = worldAt(u00);
        const p10 = worldAt(u10);
        const p11 = worldAt(u11);
        const p01 = worldAt(u01);

        // Per-face biome from the quad centre (flat, low-poly colour).
        const centerUnit = normalize(add(add(add(u00, u10), u11), u01));
        const centerElevation = elevation(centerUnit);
        const centerLatitude = Math.abs(centerUnit[1]);
        const centerMoisture = moisture(centerUnit);
        const biome = classify(config, centerElevation, centerLatitude, centerMoisture);
        const color = colorFor(biome, centerElevation, config.waterLevel);

        pushTri(p00, p11, p10, color);
        pushTri(p00, p01, p11, color);

        const isTreeBiome = biome === 'grass' || biome === 'forest';
        const scatterable = (isTreeBiome && config.trees) || (biome === 'rock' && config.rocks);
        if (scatterable) {
          const roll = scatterRng();
          const density = biome === 'rock' ? config.rockDensity : config.treeDensity;
          if (roll < density) {
            const worldCenter = scale(centerUnit, radiusAt(config, centerElevation));
            scatter.push({
              position: worldCenter,
              normal: normalize(centerUnit),
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
    seaRadius: seaRadiusOf(config),
  };
};
