//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { creasedNormals } from './normals.ts';

/** A unit cube as Manifold hands it over: eight shared corners, two triangles a face. */
const CUBE = {
  positions: new Float32Array([0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0, 0, 0, 1, 1, 0, 1, 1, 1, 1, 0, 1, 1]),
  indices: new Uint32Array([
    0, 2, 1, 0, 3, 2, 4, 5, 6, 4, 6, 7, 0, 1, 5, 0, 5, 4, 3, 7, 6, 3, 6, 2, 0, 4, 7, 0, 7, 3, 1, 2, 6, 1, 6, 5,
  ]),
};

const normalAt = (normals: Float32Array, vertex: number) =>
  [normals[vertex * 3], normals[vertex * 3 + 1], normals[vertex * 3 + 2]].map(
    (value) => Math.round(value * 1000) / 1000 + 0,
  );

describe('creasedNormals', () => {
  test('a box keeps flat faces: each corner splits into one vertex per face, normal along that face', () => {
    const { positions, indices, normals } = creasedNormals(CUBE);
    expect(positions.length / 3).toBe(24);
    expect(indices.length).toBe(CUBE.indices.length);
    for (let vertex = 0; vertex < positions.length / 3; vertex++) {
      const normal = normalAt(normals, vertex);
      expect(normal.filter((value) => value !== 0)).toHaveLength(1);
      expect(Math.abs(normal.find((value) => value !== 0) ?? 0)).toBe(1);
    }
  });

  test('faces meeting at a shallow angle share their vertices, so a curved surface stays smooth', () => {
    // Two triangles folded 10 degrees along their shared edge.
    const lift = Math.tan((10 * Math.PI) / 180);
    const fold = {
      positions: new Float32Array([0, 0, 0, 0, 0, 1, 1, 0, 0, -1, lift, 0]),
      indices: new Uint32Array([0, 1, 2, 0, 3, 1]),
    };
    const { positions, normals } = creasedNormals(fold);
    expect(positions.length / 3).toBe(4);
    // Babylon winds left-handed, so the shared normal points along -y or +y by winding: straight either way.
    expect(Math.abs(normalAt(normals, 0)[1])).toBeGreaterThan(0.99);
  });
});
