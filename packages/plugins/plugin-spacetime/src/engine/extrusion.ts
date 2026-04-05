//
// Copyright 2026 DXOS.org
//

import type { Manifold, ManifoldToplevel, Vec2 } from 'manifold-3d';

import { type Model } from '../types';

import { getFaceNormal } from './mesh-converter';

/** Minimum object dimension on any axis (matches grid step). */
export const MIN_SIZE = 1;

type Vec3 = { x: number; y: number; z: number };

/**
 * Creates a Manifold solid from a Model.Object based on its primitive type and scale.
 */
export const createSolidFromObject = (Manifold: ManifoldToplevel['Manifold'], obj: Model.Object): Manifold => {
  const size = [obj.scale.x * 2, obj.scale.y * 2, obj.scale.z * 2] as [number, number, number];
  let solid;
  switch (obj.primitive) {
    case 'sphere':
      solid = Manifold.sphere(size[0] / 2, 24);
      break;
    case 'cylinder':
      solid = Manifold.cylinder(size[1], size[0] / 2, size[0] / 2, 24);
      break;
    case 'torus':
      solid = Manifold.cylinder(size[1] * 0.5, size[0] / 2, size[0] / 2, 24);
      break;
    case 'cube':
    default:
      solid = Manifold.cube(size, true);
      break;
  }
  const translated = solid.translate([obj.position.x, obj.position.y, obj.position.z]);
  solid.delete();
  return translated;
};

//
// Face boundary extraction.
//

/**
 * Extracts the outer boundary polygon of a coplanar face group.
 * Boundary edges appear in exactly one triangle; interior edges appear in two.
 * Returns ordered 3D vertices forming the face outline.
 *
 * When `faceIDs` is provided (from Manifold's getMesh().faceID), triangles are grouped
 * by their Manifold-assigned face ID. This is much more reliable than manual coplanarity
 * checks after boolean operations, which can introduce seam edges within a logical face.
 */
export const extractFaceBoundary = (
  faceId: number,
  positions: ArrayLike<number>,
  indices: ArrayLike<number>,
  normal: Vec3,
  faceIDs?: Uint32Array,
): Array<[number, number, number]> => {
  const numTris = indices.length / 3;
  const coplanarTris: number[] = [];

  if (faceIDs && faceIDs.length >= numTris) {
    // Use Manifold's face grouping — triangles with the same faceID belong to the same logical face.
    const targetFaceID = faceIDs[faceId];
    for (let tri = 0; tri < numTris; tri++) {
      if (faceIDs[tri] === targetFaceID) {
        coplanarTris.push(tri);
      }
    }
  } else {
    // Fallback: manual coplanarity check using normal dot product + plane distance.
    const refIdx = indices[faceId * 3];
    for (let tri = 0; tri < numTris; tri++) {
      const triNormal = getFaceNormal(tri, positions, indices);
      const dot = triNormal.x * normal.x + triNormal.y * normal.y + triNormal.z * normal.z;
      if (dot < 0.99) {
        continue;
      }

      const triIdx = indices[tri * 3];
      const dx = positions[triIdx * 3] - positions[refIdx * 3];
      const dy = positions[triIdx * 3 + 1] - positions[refIdx * 3 + 1];
      const dz = positions[triIdx * 3 + 2] - positions[refIdx * 3 + 2];
      const planeDist = Math.abs(dx * normal.x + dy * normal.y + dz * normal.z);
      if (planeDist > 0.01) {
        continue;
      }

      coplanarTris.push(tri);
    }
  }

  // Find boundary edges (edges that appear in exactly one triangle).
  const posKey = (idx: number): string =>
    `${positions[idx * 3].toFixed(5)},${positions[idx * 3 + 1].toFixed(5)},${positions[idx * 3 + 2].toFixed(5)}`;

  const edgeKey = (i0: number, i1: number): string => {
    const k0 = posKey(i0);
    const k1 = posKey(i1);
    return k0 < k1 ? `${k0}|${k1}` : `${k1}|${k0}`;
  };

  type Edge = { a: [number, number, number]; b: [number, number, number] };
  const edgeMap = new Map<string, Edge>();

  for (const tri of coplanarTris) {
    const i0 = indices[tri * 3];
    const i1 = indices[tri * 3 + 1];
    const i2 = indices[tri * 3 + 2];
    const triEdges = [[i0, i1], [i1, i2], [i2, i0]] as const;

    for (const [a, b] of triEdges) {
      const key = edgeKey(a, b);
      if (edgeMap.has(key)) {
        edgeMap.delete(key); // Interior edge — shared by two triangles.
      } else {
        edgeMap.set(key, {
          a: [positions[a * 3], positions[a * 3 + 1], positions[a * 3 + 2]],
          b: [positions[b * 3], positions[b * 3 + 1], positions[b * 3 + 2]],
        });
      }
    }
  }

  // Chain boundary edges into an ordered polygon.
  const edges = [...edgeMap.values()];
  if (edges.length === 0) {
    return [];
  }

  const polygon: Array<[number, number, number]> = [edges[0].a, edges[0].b];
  const used = new Set<number>([0]);

  const posEq = (a: [number, number, number], b: [number, number, number]) =>
    Math.abs(a[0] - b[0]) < 1e-4 && Math.abs(a[1] - b[1]) < 1e-4 && Math.abs(a[2] - b[2]) < 1e-4;

  while (used.size < edges.length) {
    const last = polygon[polygon.length - 1];
    let found = false;
    for (let idx = 0; idx < edges.length; idx++) {
      if (used.has(idx)) {
        continue;
      }
      if (posEq(edges[idx].a, last)) {
        polygon.push(edges[idx].b);
        used.add(idx);
        found = true;
        break;
      }
      if (posEq(edges[idx].b, last)) {
        polygon.push(edges[idx].a);
        used.add(idx);
        found = true;
        break;
      }
    }
    if (!found) {
      break;
    }
  }

  // Remove closing vertex if it duplicates the first (closed loop).
  if (polygon.length > 1 && posEq(polygon[0], polygon[polygon.length - 1])) {
    polygon.pop();
  }

  return polygon;
};

//
// 3D → 2D projection.
//

/** Builds orthonormal axes (nx, ny) on the plane perpendicular to the given normal. */
const buildFaceAxes = (normal: Vec3): { nx: Vec3; ny: Vec3 } => {
  // Choose a reference vector not parallel to the normal.
  const ref = Math.abs(normal.y) < 0.9 ? { x: 0, y: 1, z: 0 } : { x: 1, y: 0, z: 0 };

  // nx = normalize(ref × normal).
  let nx = {
    x: ref.y * normal.z - ref.z * normal.y,
    y: ref.z * normal.x - ref.x * normal.z,
    z: ref.x * normal.y - ref.y * normal.x,
  };
  const len = Math.sqrt(nx.x * nx.x + nx.y * nx.y + nx.z * nx.z);
  nx = { x: nx.x / len, y: nx.y / len, z: nx.z / len };

  // ny = normal × nx.
  const ny = {
    x: normal.y * nx.z - normal.z * nx.y,
    y: normal.z * nx.x - normal.x * nx.z,
    z: normal.x * nx.y - normal.y * nx.x,
  };

  return { nx, ny };
};

/** Projects 3D vertices onto a 2D coordinate system defined by the face normal and origin. */
const projectTo2D = (
  vertices: Array<[number, number, number]>,
  normal: Vec3,
  origin: [number, number, number],
): Vec2[] => {
  const { nx, ny } = buildFaceAxes(normal);

  return vertices.map((vertex) => {
    const dx = vertex[0] - origin[0];
    const dy = vertex[1] - origin[1];
    const dz = vertex[2] - origin[2];
    return [dx * nx.x + dy * nx.y + dz * nx.z, dx * ny.x + dy * ny.y + dz * ny.z] as Vec2;
  });
};

/**
 * Builds a column-major 4x4 matrix that maps local coordinates (Z = face normal) to world coordinates.
 * Used to transform extruded CrossSection geometry to the face position and orientation.
 *
 * Manifold.transform() expects a 16-element column-major Mat4:
 * [col0x, col0y, col0z, 0, col1x, col1y, col1z, 0, col2x, col2y, col2z, 0, tx, ty, tz, 1]
 */
const buildZToNormalTransform = (
  normal: Vec3,
  origin: [number, number, number],
): [
  number, number, number, number,
  number, number, number, number,
  number, number, number, number,
  number, number, number, number,
] => {
  const { nx, ny } = buildFaceAxes(normal);

  return [
    nx.x, nx.y, nx.z, 0, // Column 0: local X -> world.
    ny.x, ny.y, ny.z, 0, // Column 1: local Y -> world.
    normal.x, normal.y, normal.z, 0, // Column 2: local Z (normal) -> world.
    origin[0], origin[1], origin[2], 1, // Column 3: translation.
  ];
};

//
// Face extrusion.
//

/**
 * Applies extrusion to a solid along a face defined by its boundary polygon.
 *
 * Algorithm:
 * 1. Extract the face boundary polygon from coplanar triangles.
 * 2. Project to 2D on the face plane.
 * 3. Create a CrossSection and extrude along Z.
 * 4. Transform the extrusion to align with the face normal and position.
 * 5. Boolean union (outward) or difference (inward).
 *
 * This correctly handles faces of any shape, including faces that don't span
 * the full bounding box (e.g., after prior extrusions).
 */
export const applyExtrusion = (
  wasm: ManifoldToplevel,
  baseSolid: Manifold,
  faceId: number,
  positions: ArrayLike<number>,
  indices: ArrayLike<number>,
  normal: Vec3,
  distance: number,
  faceIDs?: Uint32Array,
): Manifold => {
  const { Manifold, CrossSection } = wasm;

  if (distance === 0) {
    // NOTE: Must clone even for zero distance. The caller (onPointerUp) deletes baseSolid
    // and stores the result in ctx.solids. Self-union is a no-op clone in Manifold.
    return Manifold.union(baseSolid, baseSolid);
  }

  // Clamp negative extrusion to prevent collapse below minimum size.
  const bbox = baseSolid.boundingBox();
  const normalArr = [normal.x, normal.y, normal.z];
  const absNormal = normalArr.map(Math.abs);
  const dominantAxis = absNormal[0] >= absNormal[1] && absNormal[0] >= absNormal[2] ? 0 : absNormal[1] >= absNormal[2] ? 1 : 2;
  const bboxDim = bbox.max[dominantAxis] - bbox.min[dominantAxis];

  const sign = distance > 0 ? 1 : -1;
  let absDist = Math.abs(distance);
  if (sign < 0) {
    const maxInward = Math.max(0, bboxDim - MIN_SIZE);
    absDist = Math.min(absDist, maxInward);
    if (absDist === 0) {
      return Manifold.union(baseSolid, baseSolid);
    }
  }

  // Extract the 3D boundary polygon of the face.
  const boundary3D = extractFaceBoundary(faceId, positions, indices, normal, faceIDs);
  if (boundary3D.length < 3) {
    return Manifold.union(baseSolid, baseSolid);
  }

  // Compute face origin (centroid of boundary).
  const origin: [number, number, number] = [0, 0, 0];
  for (const vertex of boundary3D) {
    origin[0] += vertex[0];
    origin[1] += vertex[1];
    origin[2] += vertex[2];
  }
  origin[0] /= boundary3D.length;
  origin[1] /= boundary3D.length;
  origin[2] /= boundary3D.length;

  // Project to 2D and create CrossSection.
  // Reverse the polygon to ensure CCW winding — the mesh uses CW winding (swapped for Babylon),
  // but Manifold's CrossSection requires counterclockwise vertex ordering.
  const polygon2D = projectTo2D(boundary3D, normal, origin).reverse();
  const crossSection = new CrossSection([polygon2D]);
  const extruded = Manifold.extrude(crossSection, absDist);
  crossSection.delete();

  // Build transform: rotate Z→normal, translate to face position.
  // For outward extrusion: extrusion starts at the face surface.
  // For inward extrusion: extrusion starts inward from the face.
  const extrudeOrigin: [number, number, number] =
    sign > 0
      ? [origin[0], origin[1], origin[2]]
      : [origin[0] - normal.x * absDist, origin[1] - normal.y * absDist, origin[2] - normal.z * absDist];

  const transform = buildZToNormalTransform(normal, extrudeOrigin);
  const transformed = extruded.transform(transform);
  extruded.delete();

  // Boolean union (outward) or difference (inward).
  const result = sign > 0 ? Manifold.union(baseSolid, transformed) : Manifold.difference(baseSolid, transformed);
  transformed.delete();

  return result;
};
