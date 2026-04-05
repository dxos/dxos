//
// Copyright 2026 DXOS.org
//

import { log } from '@dxos/log';

/**
 * Lightweight mesh repair pipeline for making non-manifold meshes suitable for Manifold.
 *
 * Steps:
 * 1. Remove degenerate triangles (near-zero area, duplicate indices).
 * 2. Remove duplicate triangles (same vertex set).
 * 3. Weld nearby vertices (spatial hash within tolerance).
 * 4. Orient faces consistently (BFS on adjacency graph).
 */
export const repairMesh = (
  positions: Float32Array,
  indices: Uint32Array,
  tolerance = 0.0001,
): { positions: Float32Array; indices: Uint32Array } => {
  const stats = { inputTris: indices.length / 3, inputVerts: positions.length / 3 };

  // Step 1: Remove degenerate triangles.
  let cleanIndices = removeDegenerateTris(positions, indices);
  const afterDegenerate = cleanIndices.length / 3;

  // Step 2: Remove duplicate triangles.
  cleanIndices = removeDuplicateTris(cleanIndices);
  const afterDuplicate = cleanIndices.length / 3;

  // Step 3: Weld nearby vertices.
  const welded = weldVertices(positions, cleanIndices, tolerance);
  const afterWeld = welded.indices.length / 3;

  // Step 4: Orient faces consistently.
  const oriented = orientFaces(welded.positions, welded.indices);
  const afterOrient = oriented.length / 3;

  log.info('repairMesh', {
    ...stats,
    afterDegenerate,
    afterDuplicate,
    afterWeld,
    afterOrient,
    weldedVerts: welded.positions.length / 3,
  });

  return { positions: welded.positions, indices: oriented };
};

/** Removes triangles with near-zero area or duplicate vertex indices. */
const removeDegenerateTris = (positions: Float32Array, indices: Uint32Array): Uint32Array => {
  const EPSILON = 1e-10;
  const clean: number[] = [];

  for (let tri = 0; tri < indices.length / 3; tri++) {
    const i0 = indices[tri * 3];
    const i1 = indices[tri * 3 + 1];
    const i2 = indices[tri * 3 + 2];

    if (i0 === i1 || i1 === i2 || i2 === i0) {
      continue;
    }

    const ax = positions[i1 * 3] - positions[i0 * 3];
    const ay = positions[i1 * 3 + 1] - positions[i0 * 3 + 1];
    const az = positions[i1 * 3 + 2] - positions[i0 * 3 + 2];
    const bx = positions[i2 * 3] - positions[i0 * 3];
    const by = positions[i2 * 3 + 1] - positions[i0 * 3 + 1];
    const bz = positions[i2 * 3 + 2] - positions[i0 * 3 + 2];
    const cx = ay * bz - az * by;
    const cy = az * bx - ax * bz;
    const cz = ax * by - ay * bx;

    if (cx * cx + cy * cy + cz * cz > EPSILON) {
      clean.push(i0, i1, i2);
    }
  }

  return new Uint32Array(clean);
};

/** Removes duplicate triangles (same set of vertex indices regardless of order). */
const removeDuplicateTris = (indices: Uint32Array): Uint32Array => {
  const seen = new Set<string>();
  const clean: number[] = [];

  for (let tri = 0; tri < indices.length / 3; tri++) {
    const sorted = [indices[tri * 3], indices[tri * 3 + 1], indices[tri * 3 + 2]].sort((a, b) => a - b);
    const key = `${sorted[0]},${sorted[1]},${sorted[2]}`;
    if (!seen.has(key)) {
      seen.add(key);
      clean.push(indices[tri * 3], indices[tri * 3 + 1], indices[tri * 3 + 2]);
    }
  }

  return new Uint32Array(clean);
};

/** Welds vertices within tolerance using spatial hashing. Returns new positions and remapped indices. */
const weldVertices = (
  positions: Float32Array,
  indices: Uint32Array,
  tolerance: number,
): { positions: Float32Array; indices: Uint32Array } => {
  const numVerts = positions.length / 3;
  const cellSize = tolerance * 2;
  const map = new Map<string, number>();
  const remap = new Int32Array(numVerts);
  const newPositions: number[] = [];
  let newVertCount = 0;

  const cellKey = (x: number, y: number, z: number) =>
    `${Math.round(x / cellSize)},${Math.round(y / cellSize)},${Math.round(z / cellSize)}`;

  for (let vi = 0; vi < numVerts; vi++) {
    const x = positions[vi * 3];
    const y = positions[vi * 3 + 1];
    const z = positions[vi * 3 + 2];
    const key = cellKey(x, y, z);

    const existing = map.get(key);
    if (existing !== undefined) {
      // Check if the existing vertex is actually within tolerance.
      const ex = newPositions[existing * 3];
      const ey = newPositions[existing * 3 + 1];
      const ez = newPositions[existing * 3 + 2];
      const dx = x - ex;
      const dy = y - ey;
      const dz = z - ez;
      if (dx * dx + dy * dy + dz * dz <= tolerance * tolerance) {
        remap[vi] = existing;
        continue;
      }
    }

    map.set(key, newVertCount);
    remap[vi] = newVertCount;
    newPositions.push(x, y, z);
    newVertCount++;
  }

  // Remap indices.
  const newIndices = new Uint32Array(indices.length);
  for (let idx = 0; idx < indices.length; idx++) {
    newIndices[idx] = remap[indices[idx]];
  }

  return { positions: new Float32Array(newPositions), indices: newIndices };
};

/**
 * Orients faces consistently using BFS on the face adjacency graph.
 * For each edge shared by two triangles, ensures opposite winding.
 */
const orientFaces = (positions: Float32Array, indices: Uint32Array): Uint32Array => {
  const numTris = indices.length / 3;
  if (numTris === 0) {
    return indices;
  }

  // Build edge → triangle adjacency.
  const edgeKey = (a: number, b: number) => a < b ? `${a}|${b}` : `${b}|${a}`;
  const edgeTris = new Map<string, number[]>();

  for (let tri = 0; tri < numTris; tri++) {
    const v0 = indices[tri * 3];
    const v1 = indices[tri * 3 + 1];
    const v2 = indices[tri * 3 + 2];
    for (const [a, b] of [[v0, v1], [v1, v2], [v2, v0]]) {
      const key = edgeKey(a, b);
      const list = edgeTris.get(key);
      if (list) {
        list.push(tri);
      } else {
        edgeTris.set(key, [tri]);
      }
    }
  }

  // BFS to orient all reachable triangles consistently.
  const result = new Uint32Array(indices);
  const visited = new Uint8Array(numTris);

  for (let start = 0; start < numTris; start++) {
    if (visited[start]) {
      continue;
    }

    const queue: number[] = [start];
    visited[start] = 1;

    while (queue.length > 0) {
      const tri = queue.shift()!;
      const tv0 = result[tri * 3];
      const tv1 = result[tri * 3 + 1];
      const tv2 = result[tri * 3 + 2];

      for (const [a, b] of [[tv0, tv1], [tv1, tv2], [tv2, tv0]]) {
        const key = edgeKey(a, b);
        const neighbors = edgeTris.get(key);
        if (!neighbors) {
          continue;
        }

        for (const neighbor of neighbors) {
          if (neighbor === tri || visited[neighbor]) {
            continue;
          }

          visited[neighbor] = 1;

          // Check if the shared edge has consistent winding.
          // In a consistently oriented mesh, if tri has edge (a, b) in order a→b,
          // the neighbor should have it in order b→a.
          const nv0 = result[neighbor * 3];
          const nv1 = result[neighbor * 3 + 1];
          const nv2 = result[neighbor * 3 + 2];

          // Find which edge direction the neighbor uses.
          let needsFlip = false;
          if ((nv0 === a && nv1 === b) || (nv1 === a && nv2 === b) || (nv2 === a && nv0 === b)) {
            // Same direction as tri → inconsistent → flip.
            needsFlip = true;
          }

          if (needsFlip) {
            // Swap two vertices to reverse winding.
            result[neighbor * 3 + 1] = nv2;
            result[neighbor * 3 + 2] = nv1;
          }

          queue.push(neighbor);
        }
      }
    }
  }

  return result;
};
