//
// Copyright 2026 DXOS.org
//

import type { ManifoldToplevel, Manifold } from 'manifold-3d';

import { log } from '@dxos/log';

import { repairMesh } from './mesh-repair';

/**
 * Parses an OBJ file string and converts it to a Manifold solid.
 *
 * Supports:
 * - `v x y z` and `v x y z r g b` vertex lines.
 * - `f v1 v2 v3 ...` face lines (triangulated if > 3 vertices).
 * - `f v1/vt1/vn1 v2/vt2/vn2 ...` face lines with texture/normal indices (ignored).
 *
 * Ignores: mtllib, usemtl, vt, vn, g, s, o, comments.
 */
export const importOBJ = (objText: string, wasm: ManifoldToplevel): Manifold | null => {
  const { Manifold } = wasm;

  const positions: number[] = [];
  const indices: number[] = [];

  for (const rawLine of objText.split('\n')) {
    const line = rawLine.trim();
    if (line.length === 0 || line.startsWith('#')) {
      continue;
    }

    const parts = line.split(/\s+/);
    const cmd = parts[0];

    if (cmd === 'v') {
      // Vertex: v x y z [r g b].
      positions.push(parseFloat(parts[1]), parseFloat(parts[2]), parseFloat(parts[3]));
    } else if (cmd === 'f') {
      // Face: f v1 v2 v3 ... or f v1/vt1/vn1 ...
      // OBJ indices are 1-based.
      const faceIndices = parts.slice(1).map((p) => {
        const idx = parseInt(p.split('/')[0]);
        return idx > 0 ? idx - 1 : positions.length / 3 + idx; // Handle negative indices.
      });

      // Triangulate fan-style for polygons with > 3 vertices.
      for (let idx = 2; idx < faceIndices.length; idx++) {
        indices.push(faceIndices[0], faceIndices[idx - 1], faceIndices[idx]);
      }
    }
  }

  log.info('importOBJ', { vertices: positions.length / 3, triangles: indices.length / 3 });

  if (positions.length === 0 || indices.length === 0) {
    return null;
  }

  const repaired = repairMesh(new Float32Array(positions), new Uint32Array(indices));

  try {
    const mesh = new wasm.Mesh({ numProp: 3, vertProperties: repaired.positions, triVerts: repaired.indices });
    mesh.merge();
    return new Manifold(mesh);
  } catch (error) {
    log.info('importOBJ: failed to create Manifold', { error });
    return null;
  }
};
