//
// Copyright 2026 DXOS.org
//

import type { Manifold } from 'manifold-3d';

import { type SolidDebugInfo } from './DebugPanel.tsx';

// Kept out of `DebugPanel.tsx`: react-refresh only fast-refreshes a module whose
// exports are all components, so values exported beside them force a full page reload on
// every edit.

/** Extracts debug info from a Manifold solid. */
export const extractSolidDebugInfo = (solid: Manifold, position?: [number, number, number]): SolidDebugInfo => {
  const mesh = solid.getMesh();
  const { vertProperties, triVerts, numProp, numTri } = mesh;

  const seen = new Set<number>();
  const verts: SolidDebugInfo['verts'] = [];
  for (let tri = 0; tri < numTri; tri++) {
    for (let vi = 0; vi < 3; vi++) {
      const idx = triVerts[tri * 3 + vi];
      if (!seen.has(idx)) {
        seen.add(idx);
        verts.push({
          idx,
          x: vertProperties[idx * numProp],
          y: vertProperties[idx * numProp + 1],
          z: vertProperties[idx * numProp + 2],
        });
      }
    }
  }
  verts.sort((a, b) => a.idx - b.idx);

  const bbox = solid.boundingBox();
  return {
    type: 'solid',
    tris: numTri,
    verts,
    volume: solid.volume(),
    bbox: {
      min: [bbox.min[0], bbox.min[1], bbox.min[2]],
      max: [bbox.max[0], bbox.max[1], bbox.max[2]],
    },
    position,
  };
};
