//
// Copyright 2026 DXOS.org
//

import type { ManifoldToplevel, Manifold } from 'manifold-3d';
import { type ExpectStatic, afterAll, beforeAll, describe, test } from 'vitest';

import { applyExtrusion, extractFaceBoundary, extractFaceBoundaryFromSolid, MIN_SIZE } from './extrusion';
import { getFaceNormal } from './mesh-converter';

/** Tolerance for floating-point comparisons in geometry tests. */
const TOLERANCE = 0.01;

/** Helper to assert bounding box dimensions within tolerance. */
const expectBBox = (
  expect: ExpectStatic,
  solid: Manifold,
  expectedMin: [number, number, number],
  expectedMax: [number, number, number],
) => {
  const bbox = solid.boundingBox();
  expect(bbox.min[0]).toBeCloseTo(expectedMin[0], 1);
  expect(bbox.min[1]).toBeCloseTo(expectedMin[1], 1);
  expect(bbox.min[2]).toBeCloseTo(expectedMin[2], 1);
  expect(bbox.max[0]).toBeCloseTo(expectedMax[0], 1);
  expect(bbox.max[1]).toBeCloseTo(expectedMax[1], 1);
  expect(bbox.max[2]).toBeCloseTo(expectedMax[2], 1);
};

/**
 * Extracts flat-shaded positions and indices from a Manifold solid.
 * Mirrors the mesh-converter extraction used by the renderer (with CW winding swap).
 */
const extractMeshData = (solid: Manifold): { positions: Float32Array; indices: Uint32Array } => {
  const meshGL = solid.getMesh();
  const numTri = meshGL.numTri;
  const vertProperties = meshGL.vertProperties;
  const triVerts = meshGL.triVerts;
  const numProp = meshGL.numProp;

  const positions = new Float32Array(numTri * 9);
  const indices = new Uint32Array(numTri * 3);

  for (let tri = 0; tri < numTri; tri++) {
    // Swap v1/v2 for CW winding (same as mesh-converter).
    const vi0 = triVerts[tri * 3];
    const vi1 = triVerts[tri * 3 + 2];
    const vi2 = triVerts[tri * 3 + 1];

    positions[tri * 9 + 0] = vertProperties[vi0 * numProp];
    positions[tri * 9 + 1] = vertProperties[vi0 * numProp + 1];
    positions[tri * 9 + 2] = vertProperties[vi0 * numProp + 2];
    positions[tri * 9 + 3] = vertProperties[vi1 * numProp];
    positions[tri * 9 + 4] = vertProperties[vi1 * numProp + 1];
    positions[tri * 9 + 5] = vertProperties[vi1 * numProp + 2];
    positions[tri * 9 + 6] = vertProperties[vi2 * numProp];
    positions[tri * 9 + 7] = vertProperties[vi2 * numProp + 1];
    positions[tri * 9 + 8] = vertProperties[vi2 * numProp + 2];

    indices[tri * 3] = tri * 3;
    indices[tri * 3 + 1] = tri * 3 + 1;
    indices[tri * 3 + 2] = tri * 3 + 2;
  }

  return { positions, indices };
};

/**
 * Finds a triangle (faceId) whose normal matches the target direction.
 * Returns the faceId or -1 if not found.
 */
const findFaceByNormal = (
  positions: ArrayLike<number>,
  indices: ArrayLike<number>,
  targetNormal: { x: number; y: number; z: number },
): number => {
  const numTris = indices.length / 3;
  for (let tri = 0; tri < numTris; tri++) {
    const normal = getFaceNormal(tri, positions, indices);
    const dot = normal.x * targetNormal.x + normal.y * targetNormal.y + normal.z * targetNormal.z;
    if (dot > 0.99) {
      return tri;
    }
  }
  return -1;
};

/**
 * Helper that wraps the new applyExtrusion API for simpler test calls.
 * Extracts mesh data from the solid, finds the face matching the normal, and calls applyExtrusion.
 */
/** Extract Manifold faceIDs (mapped to CW-wound Babylon triangle order). */
const extractFaceIDs = (solid: Manifold): Uint32Array => {
  const mesh = solid.getMesh();
  return Uint32Array.from(mesh.faceID);
};

const extrudeByNormal = (
  ManifoldApi: ManifoldToplevel['Manifold'],
  solid: Manifold,
  normal: { x: number; y: number; z: number },
  distance: number,
): Manifold => {
  const { positions, indices } = extractMeshData(solid);
  const faceId = findFaceByNormal(positions, indices, normal);
  if (faceId < 0) {
    throw new Error(`No face found matching normal (${normal.x}, ${normal.y}, ${normal.z})`);
  }
  return applyExtrusion(ManifoldApi, solid, faceId, normal, distance);
};

describe('applyExtrusion', () => {
  let wasmInstance: ManifoldToplevel;
  let ManifoldApi: ManifoldToplevel['Manifold'];

  beforeAll(async () => {
    // Load Manifold WASM module for Node.js environment.
    const Module = await import('manifold-3d');
    wasmInstance = await Module.default();
    wasmInstance.setup();
    ManifoldApi = wasmInstance.Manifold;
  });

  afterAll(() => {
    // WASM module cleanup is handled by garbage collection.
  });

  /** Creates a 2x2x2 cube centered at the origin. */
  const makeCube = (): Manifold => {
    return ManifoldApi.cube([2, 2, 2], true);
  };

  test('basic positive extrusion on +X face', ({ expect }) => {
    // 2x2x2 cube centered at origin: bbox [-1,1] on all axes.
    // Extrude +X face by distance 1.
    // Expected: bbox [-1, 2] on X, [-1, 1] on Y, [-1, 1] on Z.
    const cube = makeCube();
    const result = extrudeByNormal(ManifoldApi, cube, { x: 1, y: 0, z: 0 }, 1);

    expectBBox(expect, result, [-1, -1, -1], [2, 1, 1]);

    result.delete();
    cube.delete();
  });

  test('basic positive extrusion on +Y face', ({ expect }) => {
    const cube = makeCube();
    const result = extrudeByNormal(ManifoldApi, cube, { x: 0, y: 1, z: 0 }, 1);

    expectBBox(expect, result, [-1, -1, -1], [1, 2, 1]);

    result.delete();
    cube.delete();
  });

  test('basic positive extrusion on +Z face', ({ expect }) => {
    const cube = makeCube();
    const result = extrudeByNormal(ManifoldApi, cube, { x: 0, y: 0, z: 1 }, 1);

    expectBBox(expect, result, [-1, -1, -1], [1, 1, 2]);

    result.delete();
    cube.delete();
  });

  test('basic positive extrusion on -X face', ({ expect }) => {
    const cube = makeCube();
    const result = extrudeByNormal(ManifoldApi, cube, { x: -1, y: 0, z: 0 }, 1);

    expectBBox(expect, result, [-2, -1, -1], [1, 1, 1]);

    result.delete();
    cube.delete();
  });

  test('basic negative extrusion on +X face', ({ expect }) => {
    // Extrude +X face by distance -0.5 (inward).
    // With face-boundary-aware extrusion, the cut should be exact.
    // Expected: bbox [-1, 0.5] on X, [-1, 1] on Y, [-1, 1] on Z.
    const cube = makeCube();
    const result = extrudeByNormal(ManifoldApi, cube, { x: 1, y: 0, z: 0 }, -0.5);

    expectBBox(expect, result, [-1, -1, -1], [0.5, 1, 1]);

    result.delete();
    cube.delete();
  });

  test('zero distance extrusion returns clone', ({ expect }) => {
    const cube = makeCube();
    const { positions, indices } = extractMeshData(cube);
    const faceId = findFaceByNormal(positions, indices, { x: 1, y: 0, z: 0 });
    const result = applyExtrusion(ManifoldApi, cube, faceId, { x: 1, y: 0, z: 0 }, 0);

    // Should return a clone with the same bounding box.
    expectBBox(expect, result, [-1, -1, -1], [1, 1, 1]);

    // Verify they are distinct objects (deleting one shouldn't affect the other).
    result.delete();
    const bbox = cube.boundingBox();
    expect(bbox.min[0]).toBeCloseTo(-1, 1);
    cube.delete();
  });

  test('sequential extrusions: +X then +Y', ({ expect }) => {
    // Start with 2x2x2 cube, extrude +X by 1, then +Y by 1.
    // After +X extrusion: bbox [-1, 2] on X, [-1, 1] on Y, [-1, 1] on Z.
    // After +Y extrusion: bbox [-1, 2] on X, [-1, 2] on Y, [-1, 1] on Z.
    const cube = makeCube();
    const afterX = extrudeByNormal(ManifoldApi, cube, { x: 1, y: 0, z: 0 }, 1);
    cube.delete();

    const afterXY = extrudeByNormal(ManifoldApi, afterX, { x: 0, y: 1, z: 0 }, 1);
    afterX.delete();

    expectBBox(expect, afterXY, [-1, -1, -1], [2, 2, 1]);

    afterXY.delete();
  });

  test('negative extrusion after positive: +X then -X', ({ expect }) => {
    // Start with 2x2x2 cube, extrude +X by 1 (now 3 wide on X: [-1, 2]).
    // Then extrude -X face by -0.5 (inward from -X face).
    // With face-boundary-aware extrusion, the -X face slab should only cover
    // the actual face boundary, not the full bounding box.
    // Expected: bbox [-0.5, 2] on X.
    const cube = makeCube();
    const afterPosX = extrudeByNormal(ManifoldApi, cube, { x: 1, y: 0, z: 0 }, 1);
    cube.delete();

    const afterNegX = extrudeByNormal(ManifoldApi, afterPosX, { x: -1, y: 0, z: 0 }, -0.5);
    afterPosX.delete();

    const bbox = afterNegX.boundingBox();
    // Verify the +X side is preserved.
    expect(bbox.max[0]).toBeCloseTo(2, 1);
    // Verify Y/Z are unchanged.
    expect(bbox.min[1]).toBeCloseTo(-1, 1);
    expect(bbox.max[1]).toBeCloseTo(1, 1);
    // The -X face should have moved inward by 0.5.
    expect(bbox.min[0]).toBeCloseTo(-0.5, 1);

    afterNegX.delete();
  });

  test('minimum size clamping prevents collapse', ({ expect }) => {
    // 2x2x2 cube. Extrude +X face by -10 (huge negative, would collapse X dimension).
    // Should clamp to leave at least MIN_SIZE (1) on X axis.
    const cube = makeCube();
    const result = extrudeByNormal(ManifoldApi, cube, { x: 1, y: 0, z: 0 }, -10);

    const bbox = result.boundingBox();
    const xSize = bbox.max[0] - bbox.min[0];
    expect(xSize).toBeGreaterThanOrEqual(MIN_SIZE - TOLERANCE);

    result.delete();
    cube.delete();
  });

  test('triangle count sanity after single extrusion', ({ expect }) => {
    // A cube has 12 triangles (2 per face, 6 faces).
    // After one extrusion, the result of a boolean union should have a reasonable triangle count.
    const cube = makeCube();
    const meshBefore = cube.getMesh();
    expect(meshBefore.numTri).toBe(12);

    const result = extrudeByNormal(ManifoldApi, cube, { x: 1, y: 0, z: 0 }, 1);
    const meshAfter = result.getMesh();

    // warp()-based extrusion preserves topology — triangle count stays the same.
    expect(meshAfter.numTri).toBe(12);

    result.delete();
    cube.delete();
  });

  test('volume increases with positive extrusion', ({ expect }) => {
    // 2x2x2 cube has volume 8.
    // Extruding +X face by 1 adds a 1x2x2 slab => volume should be ~12.
    const cube = makeCube();
    const volumeBefore = cube.volume();
    expect(volumeBefore).toBeCloseTo(8, 0);

    const result = extrudeByNormal(ManifoldApi, cube, { x: 1, y: 0, z: 0 }, 1);
    const volumeAfter = result.volume();

    // Expected volume: 2*2*3 = 12 (original 2x2x2 + 1x2x2 slab merged).
    expect(volumeAfter).toBeCloseTo(12, 0);

    result.delete();
    cube.delete();
  });

  test('volume decreases with negative extrusion', ({ expect }) => {
    const cube = makeCube();
    const volumeBefore = cube.volume();

    const result = extrudeByNormal(ManifoldApi, cube, { x: 1, y: 0, z: 0 }, -0.5);
    const volumeAfter = result.volume();

    // Original: 2x2x2 = 8. After cutting 0.5 from +X: 1.5x2x2 = 6.
    expect(volumeAfter).toBeLessThan(volumeBefore);
    expect(volumeAfter).toBeCloseTo(6, 0);

    result.delete();
    cube.delete();
  });

  test('symmetric extrusions produce symmetric results', ({ expect }) => {
    // Extrude +X and -X by the same amount should produce a symmetric solid.
    const cube = makeCube();
    const afterPosX = extrudeByNormal(ManifoldApi, cube, { x: 1, y: 0, z: 0 }, 1);
    cube.delete();

    const afterBothX = extrudeByNormal(ManifoldApi, afterPosX, { x: -1, y: 0, z: 0 }, 1);
    afterPosX.delete();

    // Should be symmetric: [-2, 2] on X.
    expectBBox(expect, afterBothX, [-2, -1, -1], [2, 1, 1]);

    afterBothX.delete();
  });

  describe('extractFaceBoundary', () => {
    test('extracts 4-vertex boundary from cube face', ({ expect }) => {
      const cube = makeCube();
      const { positions, indices } = extractMeshData(cube);
      const faceId = findFaceByNormal(positions, indices, { x: 1, y: 0, z: 0 });
      expect(faceId).toBeGreaterThanOrEqual(0);

      const boundary = extractFaceBoundary(faceId, positions, indices, { x: 1, y: 0, z: 0 });

      // A cube face boundary has 4 edges chained into a polygon.
      // The chain may include a closing vertex (first == last), so expect 4 or 5.
      expect(boundary.length).toBeGreaterThanOrEqual(4);
      expect(boundary.length).toBeLessThanOrEqual(5);

      // All boundary vertices should be at x=1 (the +X face).
      for (const vertex of boundary) {
        expect(vertex[0]).toBeCloseTo(1, 1);
      }

      cube.delete();
    });

    test('returns empty array for invalid faceId', ({ expect }) => {
      const cube = makeCube();
      const { positions, indices } = extractMeshData(cube);

      // Use a normal that doesn't match any face.
      const boundary = extractFaceBoundary(0, positions, indices, { x: 0.5, y: 0.5, z: 0.707 });

      // Should return empty or very short array since no coplanar triangles match.
      expect(boundary.length).toBeLessThanOrEqual(3);

      cube.delete();
    });
  });

  describe('drag simulation', () => {
    test('simulates drag up then down, then extrude a different face', ({ expect }) => {
      // Simulates: extrude +Y by 0.5 (drag up then back), commit, then extrude +X by 1.
      const cube = makeCube();

      // First extrusion: +Y face by 0.5.
      const afterY = extrudeByNormal(ManifoldApi, cube, { x: 0, y: 1, z: 0 }, 0.5);
      cube.delete();
      expectBBox(expect, afterY, [-1, -1, -1], [1, 1.5, 1]);
      expect(afterY.volume()).toBeCloseTo(10, 0);

      // Check the +X face boundary on the committed solid.
      const boundary = extractFaceBoundaryFromSolid(afterY, findFaceByNormal(
        extractMeshData(afterY).positions, extractMeshData(afterY).indices, { x: 1, y: 0, z: 0 }
      ), { x: 1, y: 0, z: 0 });
      // All boundary vertices should be at X=1.
      const badVerts = boundary.filter((v) => Math.abs(v[0] - 1) > 0.5);
      if (badVerts.length > 0) {
        const bStr = boundary.map((v) => `[${v[0].toFixed(2)}, ${v[1].toFixed(2)}, ${v[2].toFixed(2)}]`).join(', ');
        throw new Error(`extractFaceBoundaryFromSolid: bad verts at ${bStr} (len=${boundary.length})`);
      }
      // Should span full Y extent.
      const bYs = boundary.map((v) => v[1]);
      expect(Math.min(...bYs)).toBeCloseTo(-1, 1);
      expect(Math.max(...bYs)).toBeCloseTo(1.5, 1);

      // Second extrusion: +X face by 1 on the result.
      const afterXY = extrudeByNormal(ManifoldApi, afterY, { x: 1, y: 0, z: 0 }, 1);
      afterY.delete();

      // X should extend to 2, Y should still be 1.5.
      expect(afterXY.boundingBox().max[0]).toBeCloseTo(2, 1);
      expect(afterXY.boundingBox().max[1]).toBeCloseTo(1.5, 1);

      // Volume: original 10 + 1 * 2.5 * 2 = 15.
      expect(afterXY.volume()).toBeCloseTo(15, 0);

      afterXY.delete();
    });

    test('negative drag past zero reverses direction', ({ expect }) => {
      // Simulate dragging +X face: first outward (+1), then back inward past zero (-0.5).
      const cube = makeCube();
      const baseSolid = ManifoldApi.union(cube, cube);
      const { positions, indices } = extractMeshData(baseSolid);
      const faceIDs = extractFaceIDs(baseSolid);
      const faceId = findFaceByNormal(positions, indices, { x: 1, y: 0, z: 0 });

      // Drag outward.
      const outward = applyExtrusion(ManifoldApi, baseSolid, faceId, { x: 1, y: 0, z: 0 }, 1);
      expect(outward.boundingBox().max[0]).toBeCloseTo(2, 1);
      outward.delete();

      // Drag back past zero (inward).
      const inward = applyExtrusion(ManifoldApi, baseSolid, faceId, { x: 1, y: 0, z: 0 }, -0.5);
      expect(inward.boundingBox().max[0]).toBeCloseTo(0.5, 1);
      inward.delete();

      baseSolid.delete();
      cube.delete();
    });

    test('three sequential extrusions on different faces', ({ expect }) => {
      // Extrude +X by 1, then +Y by 1, then +Z by 1 on the result.
      // Each extrusion commits before the next.
      let solid = makeCube();

      // +X by 1.
      let next = extrudeByNormal(ManifoldApi, solid, { x: 1, y: 0, z: 0 }, 1);
      solid.delete();
      solid = next;
      expectBBox(expect, solid, [-1, -1, -1], [2, 1, 1]);

      // +Y by 1.
      next = extrudeByNormal(ManifoldApi, solid, { x: 0, y: 1, z: 0 }, 1);
      solid.delete();
      solid = next;
      expect(solid.boundingBox().max[1]).toBeCloseTo(2, 1);

      // +Z by 1.
      next = extrudeByNormal(ManifoldApi, solid, { x: 0, y: 0, z: 1 }, 1);
      solid.delete();
      solid = next;
      expect(solid.boundingBox().max[2]).toBeCloseTo(2, 1);

      // All axes should be extended.
      expect(solid.boundingBox().max[0]).toBeCloseTo(2, 1);
      expect(solid.boundingBox().max[1]).toBeCloseTo(2, 1);
      expect(solid.boundingBox().max[2]).toBeCloseTo(2, 1);
      expect(solid.boundingBox().min[0]).toBeCloseTo(-1, 1);

      solid.delete();
    });
  });
});
