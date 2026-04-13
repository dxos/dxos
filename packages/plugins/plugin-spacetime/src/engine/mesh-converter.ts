//
// Copyright 2026 DXOS.org
//

import { Color3, Mesh, StandardMaterial, VertexBuffer, VertexData, type Scene } from '@babylonjs/core';
import type { Manifold } from 'manifold-3d';

export type ConvertOptions = {
  scene: Scene;
  name?: string;
  color?: Color3;
};

/**
 * Extracts flat-shaded vertex data from a Manifold object.
 * Vertices are unshared so each triangle has its own face normal.
 * Winding is swapped (Manifold CCW -> Babylon CW).
 */
const extractVertexData = (
  manifold: Manifold,
): { positions: Float32Array; normals: Float32Array; indices: Uint32Array } => {
  const meshGL = manifold.getMesh();

  const numTri = meshGL.numTri;
  const vertProperties = meshGL.vertProperties;
  const triVerts = meshGL.triVerts;
  const numProp = meshGL.numProp;

  const positions = new Float32Array(numTri * 9);
  const normals = new Float32Array(numTri * 9);
  const indices = new Uint32Array(numTri * 3);

  for (let tri = 0; tri < numTri; tri++) {
    // Swap v1/v2 to convert Manifold CCW winding to Babylon.js CW front-face convention.
    const vi0 = triVerts[tri * 3];
    const vi1 = triVerts[tri * 3 + 2];
    const vi2 = triVerts[tri * 3 + 1];

    const p0x = vertProperties[vi0 * numProp];
    const p0y = vertProperties[vi0 * numProp + 1];
    const p0z = vertProperties[vi0 * numProp + 2];
    const p1x = vertProperties[vi1 * numProp];
    const p1y = vertProperties[vi1 * numProp + 1];
    const p1z = vertProperties[vi1 * numProp + 2];
    const p2x = vertProperties[vi2 * numProp];
    const p2y = vertProperties[vi2 * numProp + 1];
    const p2z = vertProperties[vi2 * numProp + 2];

    // Compute flat face normal (negated because winding was swapped).
    const ax = p1x - p0x;
    const ay = p1y - p0y;
    const az = p1z - p0z;
    const bx = p2x - p0x;
    const by = p2y - p0y;
    const bz = p2z - p0z;
    let nx = -(ay * bz - az * by);
    let ny = -(az * bx - ax * bz);
    let nz = -(ax * by - ay * bx);
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

  return { positions, normals, indices };
};

/**
 * Creates a new updatable Babylon.js Mesh from a Manifold object.
 */
export const manifoldToBabylon = (
  manifold: Manifold,
  { scene, name = 'manifold-mesh', color = new Color3(0.4, 0.6, 0.9) }: ConvertOptions,
): Mesh => {
  const { positions, normals, indices } = extractVertexData(manifold);

  const mesh = new Mesh(name, scene);
  const vertexData = new VertexData();
  vertexData.positions = positions;
  vertexData.indices = indices;
  vertexData.normals = normals;
  // Pass updatable=true so vertex data can be updated in-place later.
  vertexData.applyToMesh(mesh, true);

  const material = new StandardMaterial(`${name}-material`, scene);
  material.diffuseColor = color;
  material.specularColor = new Color3(0.2, 0.2, 0.2);
  material.backFaceCulling = true;
  mesh.material = material;

  return mesh;
};

/**
 * Updates an existing Babylon.js Mesh with new geometry from a Manifold object.
 * If the triangle count changed, the mesh is recreated; otherwise vertex data is updated in-place.
 */
export const updateMeshFromManifold = (manifold: Manifold, existingMesh: Mesh): void => {
  const { positions, normals, indices } = extractVertexData(manifold);

  const currentIndices = existingMesh.getIndices();
  if (currentIndices && currentIndices.length === indices.length) {
    // Same triangle count — update vertex buffers in-place (no flicker).
    existingMesh.updateVerticesData(VertexBuffer.PositionKind, positions);
    existingMesh.updateVerticesData(VertexBuffer.NormalKind, normals);
  } else {
    // Triangle count changed — must rebuild geometry.
    const vertexData = new VertexData();
    vertexData.positions = positions;
    vertexData.indices = indices;
    vertexData.normals = normals;
    vertexData.applyToMesh(existingMesh, true);
  }

  // Refresh bounding info so Babylon's ray-picking uses the new geometry extents.
  existingMesh.refreshBoundingInfo();
};

/**
 * Creates a Babylon.js Mesh directly from raw vertex positions and triangle indices.
 * Used for non-manifold meshes that Manifold rejects (e.g., non-watertight game models).
 */
export const rawDataToBabylon = (
  positions: Float32Array,
  indices: Uint32Array,
  { scene, name = 'raw-mesh', color = new Color3(0.4, 0.6, 0.9) }: ConvertOptions,
): Mesh => {
  const numTri = indices.length / 3;

  // Unshare vertices and compute flat normals (same approach as extractVertexData).
  const flatPositions = new Float32Array(numTri * 9);
  const flatNormals = new Float32Array(numTri * 9);
  const flatIndices = new Uint32Array(numTri * 3);

  for (let tri = 0; tri < numTri; tri++) {
    const vi0 = indices[tri * 3];
    const vi1 = indices[tri * 3 + 1];
    const vi2 = indices[tri * 3 + 2];

    const p0x = positions[vi0 * 3],
      p0y = positions[vi0 * 3 + 1],
      p0z = positions[vi0 * 3 + 2];
    const p1x = positions[vi1 * 3],
      p1y = positions[vi1 * 3 + 1],
      p1z = positions[vi1 * 3 + 2];
    const p2x = positions[vi2 * 3],
      p2y = positions[vi2 * 3 + 1],
      p2z = positions[vi2 * 3 + 2];

    const ax = p1x - p0x,
      ay = p1y - p0y,
      az = p1z - p0z;
    const bx = p2x - p0x,
      by = p2y - p0y,
      bz = p2z - p0z;
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
    flatPositions[base] = p0x;
    flatPositions[base + 1] = p0y;
    flatPositions[base + 2] = p0z;
    flatPositions[base + 3] = p1x;
    flatPositions[base + 4] = p1y;
    flatPositions[base + 5] = p1z;
    flatPositions[base + 6] = p2x;
    flatPositions[base + 7] = p2y;
    flatPositions[base + 8] = p2z;

    flatNormals[base] = nx;
    flatNormals[base + 1] = ny;
    flatNormals[base + 2] = nz;
    flatNormals[base + 3] = nx;
    flatNormals[base + 4] = ny;
    flatNormals[base + 5] = nz;
    flatNormals[base + 6] = nx;
    flatNormals[base + 7] = ny;
    flatNormals[base + 8] = nz;

    flatIndices[tri * 3] = tri * 3;
    flatIndices[tri * 3 + 1] = tri * 3 + 1;
    flatIndices[tri * 3 + 2] = tri * 3 + 2;
  }

  const mesh = new Mesh(name, scene);
  const vertexData = new VertexData();
  vertexData.positions = flatPositions;
  vertexData.indices = flatIndices;
  vertexData.normals = flatNormals;
  vertexData.applyToMesh(mesh, false);

  const material = new StandardMaterial(`${name}-material`, scene);
  material.diffuseColor = color;
  material.specularColor = new Color3(0.2, 0.2, 0.2);
  material.backFaceCulling = false;
  mesh.material = material;

  return mesh;
};

/**
 * Computes the outward face normal from triangle indices and vertex positions.
 * Negated because the mesh uses CW winding (swapped from Manifold's CCW).
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

  const nx = -(ay * bz - az * by);
  const ny = -(az * bx - ax * bz);
  const nz = -(ax * by - ay * bx);

  const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
  return { x: nx / len, y: ny / len, z: nz / len };
};
