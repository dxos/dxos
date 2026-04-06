//
// Copyright 2026 DXOS.org
//

import type { ManifoldToplevel, Manifold } from 'manifold-3d';

import { log } from '@dxos/log';

/** Parsed OBJ mesh data (always available, even for non-manifold meshes). */
export type ParsedOBJ = {
  positions: Float32Array;
  indices: Uint32Array;
};

/**
 * Parses an OBJ file string into raw vertex and index arrays.
 *
 * Supports:
 * - `v x y z` and `v x y z r g b` vertex lines.
 * - `f v1 v2 v3 ...` face lines (triangulated if > 3 vertices).
 * - `f v1/vt1/vn1 v2/vt2/vn2 ...` face lines with texture/normal indices (ignored).
 *
 * Ignores: mtllib, usemtl, vt, vn, g, s, o, comments.
 */
export const parseOBJ = (objText: string): ParsedOBJ | null => {
  const positionValues: number[] = [];
  const indexValues: number[] = [];

  for (const rawLine of objText.split('\n')) {
    const line = rawLine.trim();
    if (line.length === 0 || line.startsWith('#')) {
      continue;
    }

    const parts = line.split(/\s+/);
    const cmd = parts[0];

    if (cmd === 'v') {
      positionValues.push(parseFloat(parts[1]), parseFloat(parts[2]), parseFloat(parts[3]));
    } else if (cmd === 'f') {
      // OBJ indices are 1-based.
      const faceIndices = parts.slice(1).map((p) => {
        const idx = parseInt(p.split('/')[0]);
        return idx > 0 ? idx - 1 : positionValues.length / 3 + idx;
      });

      // Triangulate fan-style for polygons with > 3 vertices.
      for (let idx = 2; idx < faceIndices.length; idx++) {
        indexValues.push(faceIndices[0], faceIndices[idx - 1], faceIndices[idx]);
      }
    }
  }

  log.info('parseOBJ', { vertices: positionValues.length / 3, triangles: indexValues.length / 3 });

  if (positionValues.length === 0 || indexValues.length === 0) {
    return null;
  }

  return {
    positions: new Float32Array(positionValues),
    indices: new Uint32Array(indexValues),
  };
};

/**
 * Parses an OBJ file string and converts it to a Manifold solid.
 * Returns null if the mesh is not manifold (e.g., non-watertight game models).
 */
export const importOBJ = (objText: string, wasm: ManifoldToplevel): Manifold | null => {
  const parsed = parseOBJ(objText);
  if (!parsed) {
    return null;
  }

  try {
    const mesh = new wasm.Mesh({ numProp: 3, vertProperties: parsed.positions, triVerts: parsed.indices });
    mesh.merge();
    return new wasm.Manifold(mesh);
  } catch (error) {
    log.info('importOBJ: mesh is not manifold', { error });
    return null;
  }
};
