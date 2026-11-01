//
// Copyright 2026 DXOS.org
//

import type { ManifoldToplevel } from 'manifold-3d';

import { type Resolved3D, type Scene, findLayout, resolveLayout3D } from '@dxos/scene';

import { solidManifold } from '../solid.ts';
import { meshProps } from './mesh.ts';
import { type Triangles } from './obj.ts';

/** Kinds that draw no surface of their own. */
const NOT_SOLID = new Set(['link', 'label', 'group']);

const UNIT: Scene.Vec3 = { x: 1, y: 1, z: 1 };
const ZERO: Scene.Vec3 = { x: 0, y: 0, z: 0 };

const radians = (degrees: number) => (degrees * Math.PI) / 180;

/** A point scaled, turned by Euler degrees (x, then y, then z) and moved, as Manifold places a primitive. */
const place = (element: Resolved3D, [x, y, z]: readonly [number, number, number]): [number, number, number] => {
  const scale = element.scale ?? UNIT;
  const rotation = element.rotation ?? ZERO;
  const center = element.center ?? ZERO;
  let [px, py, pz] = [x * scale.x, y * scale.y, z * scale.z];
  const [ax, ay, az] = [radians(rotation.x), radians(rotation.y), radians(rotation.z)];
  [py, pz] = [py * Math.cos(ax) - pz * Math.sin(ax), py * Math.sin(ax) + pz * Math.cos(ax)];
  [px, pz] = [px * Math.cos(ay) + pz * Math.sin(ay), -px * Math.sin(ay) + pz * Math.cos(ay)];
  [px, py] = [px * Math.cos(az) - py * Math.sin(az), px * Math.sin(az) + py * Math.cos(az)];
  return [px + center.x, py + center.y, pz + center.z];
};

/** An element's triangles in its layout's coordinates: a mesh's own, or Manifold's for primitives and solids. */
const trianglesOf = (elements: Readonly<Record<string, Resolved3D>>, id: string, wasm: ManifoldToplevel): Triangles => {
  const element = elements[id];
  const mesh = element?.type === 'mesh' ? meshProps(element.props) : undefined;
  if (element && mesh) {
    const positions: number[] = [];
    for (let vertex = 0; vertex < mesh.positions.length; vertex += 3) {
      positions.push(
        ...place(element, [mesh.positions[vertex], mesh.positions[vertex + 1], mesh.positions[vertex + 2]]),
      );
    }
    return { positions, indices: mesh.indices };
  }
  const solid = solidManifold(elements, id, wasm);
  try {
    const { vertProperties, triVerts, numProp } = solid.getMesh();
    const positions: number[] = [];
    for (let vertex = 0; vertex < vertProperties.length; vertex += numProp) {
      positions.push(vertProperties[vertex], vertProperties[vertex + 1], vertProperties[vertex + 2]);
    }
    return { positions, indices: Array.from(triVerts) };
  } finally {
    solid.delete();
  }
};

/** Binary STL: an 80-byte header, a triangle count, then a normal, three corners and a spare uint16 per triangle. */
const writeSTL = (parts: readonly Triangles[]): ArrayBuffer => {
  const count = parts.reduce((total, part) => total + part.indices.length / 3, 0);
  const buffer = new ArrayBuffer(84 + count * 50);
  const view = new DataView(buffer);
  view.setUint32(80, count, true);
  let offset = 84;
  for (const { positions, indices } of parts) {
    for (let corner = 0; corner < indices.length; corner += 3) {
      const [a, b, c] = [indices[corner], indices[corner + 1], indices[corner + 2]].map((index) => [
        positions[index * 3],
        positions[index * 3 + 1],
        positions[index * 3 + 2],
      ]);
      const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
      const v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
      const normal = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
      const length = Math.hypot(normal[0], normal[1], normal[2]) || 1;
      for (const value of [...normal.map((part) => part / length), ...a, ...b, ...c]) {
        view.setFloat32(offset, value, true);
        offset += 4;
      }
      offset += 2;
    }
  }
  return buffer;
};

/**
 * A binary STL of a 3D layout's elements as drawn: solids evaluated, objects resolved, meshes placed. `ids` picks
 * the elements; every visible one when unset. An element that cannot be built is left out.
 */
export const exportSTL = (
  doc: Scene.SceneDocument,
  layoutId: string,
  ids: readonly string[] | undefined,
  wasm: ManifoldToplevel,
): ArrayBuffer => {
  const layout = findLayout(doc, layoutId);
  if (layout?.dim !== '3d') {
    return writeSTL([]);
  }
  const elements = resolveLayout3D(doc, layout);
  const chosen =
    ids ??
    Object.values(elements).flatMap((element) => (element.hidden || NOT_SOLID.has(element.type) ? [] : [element.id]));
  return writeSTL(
    chosen.flatMap((id) => {
      try {
        return [trianglesOf(elements, id, wasm)];
      } catch {
        return [];
      }
    }),
  );
};
