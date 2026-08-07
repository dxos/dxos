//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { FACE_UPS, faceBasis, unitOnFace } from './cubed-sphere';

describe('cubed-sphere', () => {
  test('has six faces', ({ expect }) => {
    expect(FACE_UPS).toHaveLength(6);
  });

  test('every generated vertex is on the unit sphere', ({ expect }) => {
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

  test('adjacent faces meet seamlessly (every shared edge point coincides)', ({ expect }) => {
    // +Y face's i=4 edge and +X face's j=0 edge both trace the cube edge x=1, y=1, but walk it in
    // reversed order (Y's j=0..4 mirrors X's k=4..0 — Y's j=0 and X's k=4 both land on cube corner
    // (1,1,1), Y's j=4 and X's k=0 both land on (1,1,-1)). Comparing only one index pair (e.g. via
    // `.some()` over all k) would still pass if the seam were stitched with the wrong orientation;
    // walking every sample with the correct reversed mapping cannot.
    const yUp = FACE_UPS[0];
    const xUp = FACE_UPS[2];
    const yBasis = faceBasis(yUp);
    const xBasis = faceBasis(xUp);
    for (let j = 0; j <= 4; j++) {
      const yPoint = unitOnFace(yUp, yBasis.axisA, yBasis.axisB, 4, j, 4);
      const xPoint = unitOnFace(xUp, xBasis.axisA, xBasis.axisB, 4 - j, 0, 4);
      for (let axis = 0; axis < 3; axis++) {
        expect(yPoint[axis]).toBeCloseTo(xPoint[axis], 9);
      }
    }
  });
});
