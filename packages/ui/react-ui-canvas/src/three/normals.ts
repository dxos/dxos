//
// Copyright 2026 DXOS.org
//

import { VertexData } from '@babylonjs/core';

/** Faces meeting at more than this, in degrees, keep an edge between them; shallower ones shade as one surface. */
export const CREASE_DEGREES = 30;

type Triangles = { positions: Float32Array; indices: Uint32Array };

/**
 * The mesh with its vertices split along creases, and normals for it: a solid's vertices come welded, so normals
 * averaged over every face at a corner would shade a box's flat faces as one rounded surface.
 */
export const creasedNormals = (
  { positions, indices }: Triangles,
  crease = CREASE_DEGREES,
): Triangles & { normals: Float32Array } => {
  const threshold = Math.cos((crease * Math.PI) / 180);
  const faces = indices.length / 3;
  const faceNormals = new Float32Array(faces * 3);
  for (let face = 0; face < faces; face++) {
    const [a, b, c] = [indices[face * 3], indices[face * 3 + 1], indices[face * 3 + 2]];
    const u = [0, 1, 2].map((axis) => positions[b * 3 + axis] - positions[a * 3 + axis]);
    const v = [0, 1, 2].map((axis) => positions[c * 3 + axis] - positions[a * 3 + axis]);
    const normal = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
    const length = Math.hypot(...normal) || 1;
    normal.forEach((value, axis) => (faceNormals[face * 3 + axis] = value / length));
  }
  const dot = (first: number, second: number) =>
    faceNormals[first * 3] * faceNormals[second * 3] +
    faceNormals[first * 3 + 1] * faceNormals[second * 3 + 1] +
    faceNormals[first * 3 + 2] * faceNormals[second * 3 + 2];

  // Each corner's faces, grouped with the first face of a group they lie within the crease of; a group is a vertex.
  const groups = new Map<number, number[]>();
  const split: number[] = [];
  const nextIndices = new Uint32Array(indices.length);
  for (let corner = 0; corner < indices.length; corner++) {
    const vertex = indices[corner];
    const face = Math.floor(corner / 3);
    const leaders = groups.get(vertex) ?? [];
    let group = leaders.findIndex((leader) => dot(split[leader * 2 + 1], face) >= threshold);
    if (group === -1) {
      split.push(vertex, face);
      leaders.push(split.length / 2 - 1);
      groups.set(vertex, leaders);
      group = leaders.length - 1;
    }
    nextIndices[corner] = leaders[group];
  }
  const nextPositions = new Float32Array(split.length * 1.5);
  for (let index = 0; index < split.length / 2; index++) {
    const vertex = split[index * 2];
    nextPositions.set(positions.subarray(vertex * 3, vertex * 3 + 3), index * 3);
  }
  const normals: number[] = [];
  VertexData.ComputeNormals(nextPositions, nextIndices, normals);
  return { positions: nextPositions, indices: nextIndices, normals: new Float32Array(normals) };
};
