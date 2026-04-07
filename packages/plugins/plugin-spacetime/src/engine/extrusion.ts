//
// Copyright 2026 DXOS.org
//

import type { Manifold, ManifoldToplevel, Vec2 } from 'manifold-3d';

import { Model } from '#types';

import { getFaceNormal } from './mesh-converter';

/** Minimum object dimension on any axis (matches grid step). */
export const MIN_SIZE = 1;

/**
 * Creates a Manifold solid from a Model.Object.
 * Uses mesh data if present, otherwise generates from primitive type.
 */
export const createSolidFromObject = (wasm: ManifoldToplevel, obj: Model.Object): Manifold | null => {
  const { Manifold } = wasm;

  // Mesh data takes precedence over primitive.
  if (obj.mesh?.vertexData && obj.mesh?.indexData) {
    const vertProperties = Model.decodeFloat32Array(obj.mesh.vertexData);
    const triVerts = Model.decodeUint32Array(obj.mesh.indexData);
    try {
      const mesh = new wasm.Mesh({ numProp: 3, vertProperties, triVerts });
      mesh.merge();
      return new Manifold(mesh);
    } catch {
      return null;
    }
  }

  if (!obj.primitive) {
    return null;
  }

  const size = [obj.scale.x * 2, obj.scale.y * 2, obj.scale.z * 2] as [number, number, number];
  let solid;
  switch (obj.primitive) {
    case 'sphere':
      solid = Manifold.sphere(size[0] / 2, 24);
      break;
    case 'cylinder': {
      // Manifold creates cylinders along Z. Rotate -90° around X so flat faces are parallel to ground (Y-up).
      const cyl = Manifold.cylinder(size[1], size[0] / 2, size[0] / 2, 24, true);
      solid = cyl.rotate([-90, 0, 0]);
      cyl.delete();
      break;
    }
    case 'cone': {
      // Cylinder with zero top radius, rotated so base is on the ground.
      const cone = Manifold.cylinder(size[1], size[0] / 2, 0, 24, true);
      solid = cone.rotate([-90, 0, 0]);
      cone.delete();
      break;
    }
    case 'pyramid': {
      // Extrude a square cross-section that tapers to a point (scaleTop=[0,0]).
      // Then rotate -90° around X so the base is parallel to the ground (Y-up).
      const halfW = size[0] / 2;
      const halfD = size[2] / 2;
      const cs = new wasm.CrossSection([
        [
          [-halfW, -halfD],
          [halfW, -halfD],
          [halfW, halfD],
          [-halfW, halfD],
        ] as Vec2[],
      ]);
      const pyr = Manifold.extrude(cs, size[1], 0, 0, [0, 0], true);
      cs.delete();
      solid = pyr.rotate([-90, 0, 0]);
      pyr.delete();
      break;
    }
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
 * Extracts the face boundary directly from a Manifold solid using its internal shared-vertex mesh.
 * This avoids the unshared-vertex problem in the Babylon mesh where edge cancellation fails
 * due to floating point differences between duplicate vertices.
 *
 * @param solid The Manifold solid.
 * @param babylonFaceId Triangle index from the Babylon mesh (maps 1:1 to Manifold triangles).
 * @param normal Face normal for coplanar merging.
 */
export const extractFaceBoundaryFromSolid = (
  solid: Manifold,
  babylonFaceId: number,
  normal: Model.Vec3,
): Array<[number, number, number]> => {
  const mesh = solid.getMesh();
  const { vertProperties, triVerts, numProp, numTri, faceID } = mesh;

  // Reference point on the face plane.
  const refVert = triVerts[babylonFaceId * 3];
  const refX = vertProperties[refVert * numProp];
  const refY = vertProperties[refVert * numProp + 1];
  const refZ = vertProperties[refVert * numProp + 2];

  // Collect coplanar triangles by checking EVERY triangle individually.
  // NOTE: faceIDs are unreliable — Manifold may assign the same faceID to non-coplanar
  // triangles after boolean operations. Each triangle must be geometrically verified.
  const coplanarTris: number[] = [];
  for (let tri = 0; tri < numTri; tri++) {
    const vi0 = triVerts[tri * 3];
    const vi1 = triVerts[tri * 3 + 1];
    const vi2 = triVerts[tri * 3 + 2];

    // Compute face normal from Manifold's CCW winding.
    const ax = vertProperties[vi1 * numProp] - vertProperties[vi0 * numProp];
    const ay = vertProperties[vi1 * numProp + 1] - vertProperties[vi0 * numProp + 1];
    const az = vertProperties[vi1 * numProp + 2] - vertProperties[vi0 * numProp + 2];
    const bx = vertProperties[vi2 * numProp] - vertProperties[vi0 * numProp];
    const by = vertProperties[vi2 * numProp + 1] - vertProperties[vi0 * numProp + 1];
    const bz = vertProperties[vi2 * numProp + 2] - vertProperties[vi0 * numProp + 2];
    let nx = ay * bz - az * by;
    let ny = az * bx - ax * bz;
    let nz = ax * by - ay * bx;
    const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
    if (len === 0) {
      continue;
    }
    nx /= len;
    ny /= len;
    nz /= len;

    // Check normal alignment.
    if (nx * normal.x + ny * normal.y + nz * normal.z < 0.99) {
      continue;
    }

    // Check coplanarity (same plane, not just parallel).
    const vx = vertProperties[vi0 * numProp] - refX;
    const vy = vertProperties[vi0 * numProp + 1] - refY;
    const vz = vertProperties[vi0 * numProp + 2] - refZ;
    if (Math.abs(vx * normal.x + vy * normal.y + vz * normal.z) > 0.01) {
      continue;
    }

    coplanarTris.push(tri);
  }

  // Find boundary edges using shared vertex INDICES (not positions).
  // With shared vertices, edge cancellation works reliably.
  const edgeCount = new Map<string, [number, number]>();
  const edgeKey = (a: number, b: number) => (a < b ? `${a}|${b}` : `${b}|${a}`);

  for (const tri of coplanarTris) {
    const v0 = triVerts[tri * 3];
    const v1 = triVerts[tri * 3 + 1];
    const v2 = triVerts[tri * 3 + 2];
    const edges = [
      [v0, v1],
      [v1, v2],
      [v2, v0],
    ] as const;

    for (const [a, b] of edges) {
      const key = edgeKey(a, b);
      if (edgeCount.has(key)) {
        edgeCount.delete(key);
      } else {
        edgeCount.set(key, [a, b]);
      }
    }
  }

  // Chain boundary edges into an ordered polygon.
  const boundaryEdges = [...edgeCount.values()];
  if (boundaryEdges.length === 0) {
    return [];
  }

  const getPos = (vi: number): [number, number, number] => [
    vertProperties[vi * numProp],
    vertProperties[vi * numProp + 1],
    vertProperties[vi * numProp + 2],
  ];

  const polygon: Array<[number, number, number]> = [getPos(boundaryEdges[0][0]), getPos(boundaryEdges[0][1])];
  let lastVert = boundaryEdges[0][1];
  const used = new Set<number>([0]);

  while (used.size < boundaryEdges.length) {
    let found = false;
    for (let idx = 0; idx < boundaryEdges.length; idx++) {
      if (used.has(idx)) {
        continue;
      }
      const [a, b] = boundaryEdges[idx];
      if (a === lastVert) {
        polygon.push(getPos(b));
        lastVert = b;
        used.add(idx);
        found = true;
        break;
      }
      if (b === lastVert) {
        polygon.push(getPos(a));
        lastVert = a;
        used.add(idx);
        found = true;
        break;
      }
    }
    if (!found) {
      break;
    }
  }

  // Remove closing vertex if it duplicates the first.
  if (polygon.length > 1) {
    const first = polygon[0];
    const last = polygon[polygon.length - 1];
    if (
      Math.abs(first[0] - last[0]) < 1e-5 &&
      Math.abs(first[1] - last[1]) < 1e-5 &&
      Math.abs(first[2] - last[2]) < 1e-5
    ) {
      polygon.pop();
    }
  }

  return polygon;
};

/**
 * Extracts the outer boundary polygon of a coplanar face group from Babylon mesh data.
 * @deprecated Use extractFaceBoundaryFromSolid for reliable results with shared vertices.
 */
export const extractFaceBoundary = (
  faceId: number,
  positions: ArrayLike<number>,
  indices: ArrayLike<number>,
  normal: Model.Vec3,
  faceIDs?: Uint32Array,
): Array<[number, number, number]> => {
  const numTris = indices.length / 3;
  const coplanarTris: number[] = [];

  // Collect all coplanar triangles using both faceID grouping AND geometric coplanarity.
  // After boolean operations, a logical face may be split into multiple faceIDs
  // (e.g., the +X face of a cube becomes two faceIDs after a +Y extrusion creates
  // a column — both sub-faces are coplanar but have different origins).
  // We merge by: first collecting all faceIDs that share the same plane as the selected face,
  // then collecting all triangles with any of those faceIDs.
  const refIdx = indices[faceId * 3];

  if (faceIDs && faceIDs.length >= numTris) {
    // Phase 1: find all faceIDs that are coplanar with the selected face.
    const coplanarFaceIDs = new Set<number>();
    coplanarFaceIDs.add(faceIDs[faceId]);

    // Check one triangle from each unique faceID for coplanarity.
    const seenFaceIDs = new Set<number>();
    for (let tri = 0; tri < numTris; tri++) {
      const fid = faceIDs[tri];
      if (seenFaceIDs.has(fid)) {
        continue;
      }
      seenFaceIDs.add(fid);

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

      coplanarFaceIDs.add(fid);
    }

    // Phase 2: collect all triangles with any of the coplanar faceIDs.
    for (let tri = 0; tri < numTris; tri++) {
      if (coplanarFaceIDs.has(faceIDs[tri])) {
        coplanarTris.push(tri);
      }
    }
  } else {
    // Fallback: manual coplanarity check using normal dot product + plane distance.
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
    const triEdges = [
      [i0, i1],
      [i1, i2],
      [i2, i0],
    ] as const;

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
const buildFaceAxes = (normal: Model.Vec3): { nx: Model.Vec3; ny: Model.Vec3 } => {
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
export const projectTo2D = (
  vertices: Array<[number, number, number]>,
  normal: Model.Vec3,
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

//
// Face extrusion.
//

/**
 * Applies extrusion to a solid by moving face vertices along the normal.
 *
 * Uses Manifold's `warp()` to selectively move vertices that lie on the face plane.
 * This is a topological operation (vertex movement), not a CSG operation (boolean union),
 * so it preserves vertex count and doesn't create seam artifacts.
 *
 * The side faces connecting moved and unmoved vertices stretch automatically.
 */
export const applyExtrusion = (
  Manifold: ManifoldToplevel['Manifold'],
  baseSolid: Manifold,
  faceId: number,
  normal: Model.Vec3,
  distance: number,
): Manifold => {
  if (distance === 0) {
    // NOTE: Must clone even for zero distance. The caller (onPointerUp) deletes baseSolid
    // and stores the result in ctx.solids. Self-union is a no-op clone in Manifold.
    return Manifold.union(baseSolid, baseSolid);
  }

  // Clamp negative extrusion to prevent collapse below minimum size.
  const bbox = baseSolid.boundingBox();
  const normalArr = [normal.x, normal.y, normal.z];
  const absNormal = normalArr.map(Math.abs);
  const dominantAxis =
    absNormal[0] >= absNormal[1] && absNormal[0] >= absNormal[2] ? 0 : absNormal[1] >= absNormal[2] ? 1 : 2;
  const bboxDim = bbox.max[dominantAxis] - bbox.min[dominantAxis];

  let clampedDistance = distance;
  if (distance < 0) {
    const maxInward = Math.max(0, bboxDim - MIN_SIZE);
    clampedDistance = -Math.min(Math.abs(distance), maxInward);
    if (clampedDistance === 0) {
      return Manifold.union(baseSolid, baseSolid);
    }
  }

  // Get the reference point on the face plane from the Manifold mesh.
  const mesh = baseSolid.getMesh();
  const { vertProperties, triVerts, numProp } = mesh;
  const refVert = triVerts[faceId * 3];
  const refX = vertProperties[refVert * numProp];
  const refY = vertProperties[refVert * numProp + 1];
  const refZ = vertProperties[refVert * numProp + 2];

  // Move face vertices along the normal using warp().
  // A vertex is on the face plane if its signed distance to the plane is ~0.
  const nx = normal.x;
  const ny = normal.y;
  const nz = normal.z;
  const dx = nx * clampedDistance;
  const dy = ny * clampedDistance;
  const dz = nz * clampedDistance;

  return baseSolid.warp((vert) => {
    const planeDist = (vert[0] - refX) * nx + (vert[1] - refY) * ny + (vert[2] - refZ) * nz;
    if (Math.abs(planeDist) < 0.001) {
      vert[0] += dx;
      vert[1] += dy;
      vert[2] += dz;
    }
  });
};
