//
// Copyright 2026 DXOS.org
//

import {
  Color3,
  Mesh,
  StandardMaterial,
  VertexData,
  type Scene,
} from '@babylonjs/core';
import type { Manifold } from 'manifold-3d';

export type ConvertOptions = {
  scene: Scene;
  name?: string;
  color?: Color3;
};

/**
 * Converts a Manifold object to a Babylon.js Mesh.
 */
export const manifoldToBabylon = (
  manifold: Manifold,
  { scene, name = 'manifold-mesh', color = new Color3(0.4, 0.6, 0.9) }: ConvertOptions,
): Mesh => {
  const meshGL = manifold.getMesh();

  const numVert = meshGL.numVert;
  const numTri = meshGL.numTri;
  const vertProperties = meshGL.vertProperties;
  const triVerts = meshGL.triVerts;
  const numProp = meshGL.numProp;

  // Extract positions (first 3 properties per vertex).
  const positions = new Float32Array(numVert * 3);
  for (let i = 0; i < numVert; i++) {
    positions[i * 3] = vertProperties[i * numProp];
    positions[i * 3 + 1] = vertProperties[i * numProp + 1];
    positions[i * 3 + 2] = vertProperties[i * numProp + 2];
  }

  // Extract indices.
  const indices = new Uint32Array(numTri * 3);
  for (let i = 0; i < numTri * 3; i++) {
    indices[i] = triVerts[i];
  }

  const mesh = new Mesh(name, scene);
  const vertexData = new VertexData();
  vertexData.positions = positions;
  vertexData.indices = indices;

  // Compute normals from geometry.
  const normals: number[] = [];
  VertexData.ComputeNormals(positions, indices, normals);
  vertexData.normals = normals;

  vertexData.applyToMesh(mesh);

  const material = new StandardMaterial(`${name}-material`, scene);
  material.diffuseColor = color;
  material.specularColor = new Color3(0.2, 0.2, 0.2);
  material.backFaceCulling = true;
  mesh.material = material;

  return mesh;
};

/**
 * Computes the face normal from triangle indices and vertex positions.
 */
export const getFaceNormal = (
  faceId: number,
  positions: ArrayLike<number>,
  indices: ArrayLike<number>,
): { x: number; y: number; z: number } => {
  const i0 = indices[faceId * 3];
  const i1 = indices[faceId * 3 + 1];
  const i2 = indices[faceId * 3 + 2];

  const ax = positions[i1 * 3] - positions[i0 * 3];
  const ay = positions[i1 * 3 + 1] - positions[i0 * 3 + 1];
  const az = positions[i1 * 3 + 2] - positions[i0 * 3 + 2];

  const bx = positions[i2 * 3] - positions[i0 * 3];
  const by = positions[i2 * 3 + 1] - positions[i0 * 3 + 1];
  const bz = positions[i2 * 3 + 2] - positions[i0 * 3 + 2];

  const nx = ay * bz - az * by;
  const ny = az * bx - ax * bz;
  const nz = ax * by - ay * bx;

  const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
  return { x: nx / len, y: ny / len, z: nz / len };
};
