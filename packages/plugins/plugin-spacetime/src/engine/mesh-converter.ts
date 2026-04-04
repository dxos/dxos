//
// Copyright 2026 DXOS.org
//

import { Color3, Mesh, StandardMaterial, VertexData, type Scene } from '@babylonjs/core';
import type { Manifold } from 'manifold-3d';

export type ConvertOptions = {
  scene: Scene;
  name?: string;
  color?: Color3;
};

/**
 * Converts a Manifold object to a Babylon.js Mesh with flat shading (sharp edges).
 * Vertices are unshared so each triangle has its own face normal.
 */
export const manifoldToBabylon = (
  manifold: Manifold,
  { scene, name = 'manifold-mesh', color = new Color3(0.4, 0.6, 0.9) }: ConvertOptions,
): Mesh => {
  const meshGL = manifold.getMesh();

  const numTri = meshGL.numTri;
  const vertProperties = meshGL.vertProperties;
  const triVerts = meshGL.triVerts;
  const numProp = meshGL.numProp;

  // Unshare vertices for flat shading: 3 unique vertices per triangle.
  const positions = new Float32Array(numTri * 9);
  const normals = new Float32Array(numTri * 9);
  const indices = new Uint32Array(numTri * 3);

  for (let tri = 0; tri < numTri; tri++) {
    const vi0 = triVerts[tri * 3];
    const vi1 = triVerts[tri * 3 + 1];
    const vi2 = triVerts[tri * 3 + 2];

    // Read positions for each vertex of this triangle.
    const p0x = vertProperties[vi0 * numProp];
    const p0y = vertProperties[vi0 * numProp + 1];
    const p0z = vertProperties[vi0 * numProp + 2];
    const p1x = vertProperties[vi1 * numProp];
    const p1y = vertProperties[vi1 * numProp + 1];
    const p1z = vertProperties[vi1 * numProp + 2];
    const p2x = vertProperties[vi2 * numProp];
    const p2y = vertProperties[vi2 * numProp + 1];
    const p2z = vertProperties[vi2 * numProp + 2];

    // Compute flat face normal.
    const ax = p1x - p0x;
    const ay = p1y - p0y;
    const az = p1z - p0z;
    const bx = p2x - p0x;
    const by = p2y - p0y;
    const bz = p2z - p0z;
    let nx = ay * bz - az * by;
    let ny = az * bx - ax * bz;
    let nz = ax * by - ay * bx;
    const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
    if (len > 0) {
      nx /= len;
      ny /= len;
      nz /= len;
    }

    const base = tri * 9;
    positions[base] = p0x;
    positions[base + 1] = p0y;
    positions[base + 2] = p0z;
    positions[base + 3] = p1x;
    positions[base + 4] = p1y;
    positions[base + 5] = p1z;
    positions[base + 6] = p2x;
    positions[base + 7] = p2y;
    positions[base + 8] = p2z;

    // Same normal for all 3 vertices (flat shading).
    normals[base] = nx;
    normals[base + 1] = ny;
    normals[base + 2] = nz;
    normals[base + 3] = nx;
    normals[base + 4] = ny;
    normals[base + 5] = nz;
    normals[base + 6] = nx;
    normals[base + 7] = ny;
    normals[base + 8] = nz;

    indices[tri * 3] = tri * 3;
    indices[tri * 3 + 1] = tri * 3 + 1;
    indices[tri * 3 + 2] = tri * 3 + 2;
  }

  const mesh = new Mesh(name, scene);
  const vertexData = new VertexData();
  vertexData.positions = positions;
  vertexData.indices = indices;
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
