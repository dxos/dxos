//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { type TerraConfigValues, generatePlanet } from './generate-planet.ts';

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

describe('generatePlanet', () => {
  test('emits the expected triangle count for six faces', () => {
    const { mesh } = generatePlanet(config);
    // 6 faces * resolution^2 quads * 2 tris * 3 verts * 3 components.
    expect(mesh.positions.length).toBe(6 * config.resolution * config.resolution * 2 * 3 * 3);
    expect(mesh.normals.length).toBe(mesh.positions.length);
    expect(mesh.colors.length).toBe((mesh.positions.length / 3) * 4);
  });

  test('is deterministic for a seed', () => {
    const a = generatePlanet(config);
    const b = generatePlanet(config);
    expect(Array.from(a.mesh.positions)).toEqual(Array.from(b.mesh.positions));
    expect(a.scatter.length).toBe(b.scatter.length);
  });

  test('scatter can be disabled', () => {
    const { scatter } = generatePlanet({ ...config, trees: false, rocks: false });
    expect(scatter).toHaveLength(0);
  });
});
