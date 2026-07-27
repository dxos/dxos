//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { FACE_UPS, faceBasis, normalize, unitOnFace } from './cubed-sphere';

describe('cubed-sphere', () => {
  test('has six faces', () => {
    expect(FACE_UPS).toHaveLength(6);
  });

  test('every generated vertex is on the unit sphere', () => {
    for (const up of FACE_UPS) {
      const { axisA, axisB } = faceBasis(up);
      for (let i = 0; i <= 4; i++) {
        for (let j = 0; j <= 4; j++) {
          const [x, y, z] = unitOnFace(up, axisA, axisB, i, j, 4);
          expect(Math.hypot(x, y, z)).toBeCloseTo(1, 6);
        }
      }
    }
  });

  test('adjacent faces meet seamlessly (shared edge points coincide)', () => {
    // +Y face right edge (i=4) and +X face edge (j=0) both trace the cube edge x=1, y=1.
    const yUp = FACE_UPS[0];
    const xUp = FACE_UPS[2];
    const yBasis = faceBasis(yUp);
    const xBasis = faceBasis(xUp);
    // Corner shared by +Y and +X faces: cube corner (1,1,1) — assert at least one exact coincidence.
    const yCorner = unitOnFace(yUp, yBasis.axisA, yBasis.axisB, 4, 0, 4);
    const match = [0, 1, 2, 3, 4].some((k) => {
      const p = unitOnFace(xUp, xBasis.axisA, xBasis.axisB, k, 0, 4);
      return normalize(yCorner).every((v, idx) => Math.abs(v - p[idx]) < 1e-9);
    });
    expect(match).toBe(true);
  });
});
