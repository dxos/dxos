//
// Copyright 2026 DXOS.org
//

//
// Solids as operation trees (design decision 9): a `solid` element names an operation over other elements of its
// scene, and its geometry is recomputed with Manifold whenever it is drawn. Primitive construction is ported from
// plugin-spacetime's engine (retired in stage 3), with `scale` read as the size rather than spacetime's half-size.
//

import type { Manifold, ManifoldToplevel, Vec3 as ManifoldVec3 } from 'manifold-3d';

import { type Resolved3D, type Scene } from '@dxos/scene';

import { type MeshData } from './renderer.ts';

/** A layout's elements by id, resolved against its model, which a solid's operands are named among. */
export type Elements3D = Readonly<Record<string, Resolved3D>>;

const UNIT: Scene.Vec3 = { x: 1, y: 1, z: 1 };
const ZERO: Scene.Vec3 = { x: 0, y: 0, z: 0 };
const SEGMENTS = 48;

/** The radius of a rounded cube's corners as a share of its smallest side. */
const ROUNDING = 0.15;

class SolidError extends Error {}

const stringProp = (element: Scene.Element3D, name: string): string | undefined => {
  const value = element.props?.[name];
  return typeof value === 'string' ? value : undefined;
};

const numberProp = (element: Scene.Element3D, name: string): number | undefined => {
  const value = element.props?.[name];
  return typeof value === 'number' ? value : undefined;
};

const vecProp = (element: Scene.Element3D, name: string): Scene.Vec3 | undefined => {
  const value = element.props?.[name];
  return typeof value === 'object' &&
    value !== null &&
    'x' in value &&
    'y' in value &&
    'z' in value &&
    typeof value.x === 'number' &&
    typeof value.y === 'number' &&
    typeof value.z === 'number'
    ? { x: value.x, y: value.y, z: value.z }
    : undefined;
};

/** Applies `step` to `solid` and frees the input, since every Manifold operation returns a new WASM object. */
const then = (solid: Manifold, step: (solid: Manifold) => Manifold): Manifold => {
  const next = step(solid);
  solid.delete();
  return next;
};

/** A cube of `size` centred on the origin with its corners rounded: the hull of a sphere at each corner. */
const roundedCube = (wasm: ManifoldToplevel, size: Scene.Vec3): Manifold => {
  const radius = ROUNDING * Math.min(size.x, size.y, size.z);
  const corner = (sign: number, half: number) => sign * Math.max(half - radius, 0);
  const spheres: Manifold[] = [];
  for (const sx of [-1, 1]) {
    for (const sy of [-1, 1]) {
      for (const sz of [-1, 1]) {
        spheres.push(
          then(wasm.Manifold.sphere(radius, 16), (sphere) =>
            sphere.translate([corner(sx, size.x / 2), corner(sy, size.y / 2), corner(sz, size.z / 2)]),
          ),
        );
      }
    }
  }
  const hull = wasm.Manifold.hull(spheres);
  spheres.forEach((sphere) => sphere.delete());
  return hull;
};

/** A primitive of the element's kind and size, centred on the origin; Manifold cylinders run along z, so they turn. */
export const primitiveSolid = (wasm: ManifoldToplevel, kind: string, size: Scene.Vec3, rounded = false): Manifold => {
  const { Manifold } = wasm;
  switch (kind) {
    case 'sphere':
      return Manifold.sphere(size.x / 2, SEGMENTS);
    case 'cylinder':
      return then(Manifold.cylinder(size.y, size.x / 2, size.x / 2, SEGMENTS, true), (solid) =>
        solid.rotate([-90, 0, 0]),
      );
    case 'cone':
      return then(Manifold.cylinder(size.y, size.x / 2, 0, SEGMENTS, true), (solid) => solid.rotate([-90, 0, 0]));
    case 'pyramid':
      return then(Manifold.cylinder(size.y, size.x / 2, 0, 4, true), (solid) => solid.rotate([-90, 45, 0]));
    case 'cube':
      return rounded ? roundedCube(wasm, size) : Manifold.cube([size.x, size.y, size.z], true);
    default:
      throw new SolidError(`A solid cannot use a "${kind}".`);
  }
};

/** Moves every vertex on the face whose outward normal is `normal` by `distance` along it (spacetime's extrusion). */
const extrude = (solid: Manifold, normal: Scene.Vec3, distance: number): Manifold => {
  const length = Math.hypot(normal.x, normal.y, normal.z) || 1;
  const unit = { x: normal.x / length, y: normal.y / length, z: normal.z / length };
  const along = ([x, y, z]: ManifoldVec3) => x * unit.x + y * unit.y + z * unit.z;
  const box = solid.boundingBox();
  const extreme = Math.max(
    ...[box.min, box.max].flatMap((low) =>
      [box.min, box.max].flatMap((mid) => [box.min, box.max].map((high) => along([low[0], mid[1], high[2]]))),
    ),
  );
  const epsilon = 1e-5 * Math.max(1, Math.abs(extreme));
  return then(solid, (input) =>
    input.warp((vertex) => {
      if (along(vertex) >= extreme - epsilon) {
        vertex[0] += unit.x * distance;
        vertex[1] += unit.y * distance;
        vertex[2] += unit.z * distance;
      }
    }),
  );
};

/** Builds an element as a solid in its scene's coordinates; `path` guards against a solid that names itself. */
const build = (elements: Elements3D, id: string, wasm: ManifoldToplevel, path: readonly string[]): Manifold => {
  const element = elements[id];
  if (!element) {
    throw new SolidError(`Operand "${id}" is missing.`);
  }
  if (path.includes(id)) {
    throw new SolidError(`Solid "${id}" uses itself.`);
  }
  const position = element.center ?? ZERO;
  if (element.kind !== 'solid') {
    const rotation = element.rotation ?? ZERO;
    return then(
      then(primitiveSolid(wasm, element.kind, element.scale ?? UNIT, element.style?.rounded ?? false), (solid) =>
        solid.rotate([rotation.x, rotation.y, rotation.z]),
      ),
      (solid) => solid.translate([position.x, position.y, position.z]),
    );
  }
  const next = [...path, id];
  const op = stringProp(element, 'op');
  switch (op) {
    case 'union':
    case 'difference': {
      const operands = (stringProp(element, 'operands') ?? '').split(/\s+/).filter(Boolean);
      if (operands.length === 0) {
        throw new SolidError(`Solid "${id}" has no operands.`);
      }
      const solids: Manifold[] = [];
      try {
        for (const operand of operands) {
          solids.push(build(elements, operand, wasm, next));
        }
      } catch (error) {
        solids.forEach((solid) => solid.delete());
        throw error;
      }
      const [first, ...rest] = solids;
      return rest.reduce((result, solid) => {
        const combined = op === 'union' ? result.add(solid) : result.subtract(solid);
        result.delete();
        solid.delete();
        return combined;
      }, first);
    }
    case 'extrude': {
      const target = stringProp(element, 'target');
      const face = vecProp(element, 'face');
      if (!target || !face) {
        throw new SolidError(`Solid "${id}" needs a target and a face to extrude.`);
      }
      return extrude(build(elements, target, wasm, next), face, numberProp(element, 'distance') ?? 0);
    }
    default:
      throw new SolidError(`Solid "${id}" has no operation "${op ?? ''}".`);
  }
};

/** A Manifold's triangles in Babylon's left-handed winding. */
export const toMeshData = (solid: Manifold): MeshData => {
  const mesh = solid.getMesh();
  const stride = mesh.numProp;
  const count = mesh.vertProperties.length / stride;
  const positions = new Float32Array(count * 3);
  for (let vertex = 0; vertex < count; vertex++) {
    positions[vertex * 3] = mesh.vertProperties[vertex * stride];
    positions[vertex * 3 + 1] = mesh.vertProperties[vertex * stride + 1];
    positions[vertex * 3 + 2] = mesh.vertProperties[vertex * stride + 2];
  }
  const indices = new Uint32Array(mesh.triVerts.length);
  for (let corner = 0; corner < indices.length; corner += 3) {
    indices[corner] = mesh.triVerts[corner];
    indices[corner + 1] = mesh.triVerts[corner + 2];
    indices[corner + 2] = mesh.triVerts[corner + 1];
  }
  return { positions, indices };
};

/** A solid element's triangles in its scene's coordinates, or why it cannot be built (Review Focus 4). */
export const evaluateSolid = (
  elements: Elements3D,
  id: string,
  wasm: ManifoldToplevel,
): { mesh: MeshData } | { error: string } => {
  try {
    const solid = build(elements, id, wasm, []);
    try {
      // An operand of size 0, or a difference that removes everything, builds a valid solid with nothing in it.
      if (solid.isEmpty()) {
        return { error: `Solid "${id}" is empty.` };
      }
      return { mesh: toMeshData(solid) };
    } finally {
      solid.delete();
    }
  } catch (error) {
    // Any failure, a WASM abort included, draws the operands instead rather than unmounting the view.
    return { error: error instanceof Error ? error.message : String(error) };
  }
};

/** The elements a solid is built from, itself included, so equal trees can share one result. */
export const solidKey = (elements: Elements3D, id: string): string => {
  const seen = new Set<string>();
  const visit = (name: string) => {
    const element = elements[name];
    if (!element || seen.has(name)) {
      return;
    }
    seen.add(name);
    [...(stringProp(element, 'operands') ?? '').split(/\s+/), stringProp(element, 'target') ?? ''].forEach(visit);
  };
  visit(id);
  return JSON.stringify([...seen].sort().map((name) => elements[name]));
};

/** The volume of a solid element, for checks; NaN when it cannot be built. */
export const solidVolume = (elements: Elements3D, id: string, wasm: ManifoldToplevel): number => {
  try {
    const solid = build(elements, id, wasm, []);
    const volume = solid.volume();
    solid.delete();
    return volume;
  } catch {
    return Number.NaN;
  }
};

const concat = (meshes: readonly MeshData[]): MeshData => {
  const positions = new Float32Array(meshes.reduce((total, mesh) => total + mesh.positions.length, 0));
  const indices = new Uint32Array(meshes.reduce((total, mesh) => total + mesh.indices.length, 0));
  let vertexOffset = 0;
  let positionOffset = 0;
  let indexOffset = 0;
  for (const mesh of meshes) {
    positions.set(mesh.positions, positionOffset);
    indices.set(
      mesh.indices.map((index) => index + vertexOffset),
      indexOffset,
    );
    positionOffset += mesh.positions.length;
    indexOffset += mesh.indices.length;
    vertexOffset += mesh.positions.length / 3;
  }
  return { positions, indices };
};

/** What a solid that cannot be built draws instead: its operands that do exist, each as itself (Review Focus 4). */
export const fallbackMesh = (elements: Elements3D, id: string, wasm: ManifoldToplevel): MeshData | undefined => {
  const element = elements[id];
  if (!element) {
    return undefined;
  }
  const names = [...(stringProp(element, 'operands') ?? '').split(/\s+/), stringProp(element, 'target') ?? ''];
  const meshes = names.flatMap((name) => {
    if (!name || name === id || !elements[name]) {
      return [];
    }
    const result = evaluateSolid(elements, name, wasm);
    return 'mesh' in result ? [result.mesh] : [];
  });
  return meshes.length > 0 ? concat(meshes) : undefined;
};
