//
// Copyright 2026 DXOS.org
//

import type { Manifold } from 'manifold-3d';

import { Model } from '../types';

/** Serialize a Manifold solid to ECHO-compatible mesh data. */
export const serializeManifold = (solid: Manifold): Model.Mesh => {
  const meshData = solid.getMesh();
  const { vertProperties, triVerts, numProp } = meshData;
  const numVert = vertProperties.length / numProp;
  const positions = new Float32Array(numVert * 3);
  for (let vi = 0; vi < numVert; vi++) {
    positions[vi * 3] = vertProperties[vi * numProp];
    positions[vi * 3 + 1] = vertProperties[vi * numProp + 1];
    positions[vi * 3 + 2] = vertProperties[vi * numProp + 2];
  }
  return {
    vertexData: Model.encodeTypedArray(positions),
    indexData: Model.encodeTypedArray(new Uint32Array(triVerts)),
  };
};
