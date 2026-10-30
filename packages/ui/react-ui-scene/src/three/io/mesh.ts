//
// Copyright 2026 DXOS.org
//

import * as Data from 'effect/Data';
import * as Effect from 'effect/Effect';

import { type Scene } from '@dxos/scene';

import { type RenderItem } from '../render-list.ts';
import { type MeshData } from '../renderer.ts';
import { parseGLB } from './glb.ts';
import { type Triangles, parseOBJ } from './obj.ts';

/**
 * An imported mesh as a `mesh` object stores it in `props.mesh`: unit-sized triangles centred on the origin (so the
 * placing element's `scale` sizes it, as for every other kind), and a key naming its content for caches.
 */
export type MeshProps = { key: string; positions: number[]; indices: number[] };

export class MeshImportError extends Data.TaggedError('MeshImportError')<{ readonly message: string }> {}

const isNumbers = (value: unknown): value is number[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'number');

/** The `props.mesh` an element or object carries, if it is a well-formed mesh. */
export const meshProps = (props: Readonly<Record<string, unknown>> | undefined): MeshProps | undefined => {
  const value: unknown = props?.mesh;
  if (typeof value !== 'object' || value === null) {
    return undefined;
  }
  const key: unknown = 'key' in value ? value.key : undefined;
  const positions: unknown = 'positions' in value ? value.positions : undefined;
  const indices: unknown = 'indices' in value ? value.indices : undefined;
  return typeof key === 'string' && isNumbers(positions) && isNumbers(indices)
    ? { key, positions, indices }
    : undefined;
};

/** FNV-1a over the numbers, so two imports of one file share a key and a cached mesh. */
const contentKey = ({ positions, indices }: Triangles): string => {
  let hash = 0x811c9dc5;
  for (const value of [...positions, ...indices]) {
    hash ^= Math.round(value * 1e6) | 0;
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return `${positions.length / 3}-${indices.length / 3}-${hash.toString(16)}`;
};

/** The triangles scaled so their largest extent is 1 and centred on the origin, as primitives are. */
const normalize = ({ positions, indices }: Triangles): Triangles => {
  const axes = [0, 1, 2].map((axis) => positions.filter((_, index) => index % 3 === axis));
  const low = axes.map((values) => Math.min(...values));
  const high = axes.map((values) => Math.max(...values));
  const extent = Math.max(...high.map((value, axis) => value - low[axis])) || 1;
  const middle = high.map((value, axis) => (value + low[axis]) / 2);
  return {
    positions: positions.map((value, index) => Math.round(((value - middle[index % 3]) / extent) * 1e6) / 1e6 + 0),
    indices,
  };
};

/** The file's name without its extension, as an id: an object has no label, so the Library names it by this. */
const idOf = (file: File): string =>
  file.name
    .replace(/\.[^.]+$/, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'mesh';

/** A `mesh` object of the triangles, unit-sized and centred, keyed by its content. */
export const meshObject = (id: string, triangles: Triangles): Scene.Object3D => {
  const unit = normalize(triangles);
  return { id, type: 'mesh', props: { mesh: { key: contentKey(unit), ...unit } } };
};

/**
 * Reads an OBJ or GLB file as a `mesh` object for the model: placing it stores the triangles once however often it is
 * placed. Fails with `MeshImportError` when the file holds no triangles.
 */
export const importMesh = (file: File): Effect.Effect<Scene.Object3D, MeshImportError> =>
  Effect.gen(function* () {
    const data = yield* Effect.tryPromise({
      try: () => file.arrayBuffer(),
      catch: (error) => new MeshImportError({ message: `Cannot read "${file.name}": ${String(error)}` }),
    });
    const triangles = /\.glb$/i.test(file.name) ? parseGLB(data) : parseOBJ(new TextDecoder().decode(data));
    if (!triangles) {
      return yield* Effect.fail(new MeshImportError({ message: `"${file.name}" holds no triangles.` }));
    }
    return meshObject(idOf(file), triangles);
  });

const drawn = new Map<string, MeshData>();

/** A mesh item's triangles for the renderer, in Babylon's left-handed winding; one per mesh content. */
export const meshData = (item: Pick<RenderItem, 'id' | 'type' | 'elements'>): MeshData | undefined => {
  if (item.type !== 'mesh') {
    return undefined;
  }
  const mesh = meshProps(item.elements[item.id]?.props);
  if (!mesh) {
    return undefined;
  }
  let data = drawn.get(mesh.key);
  if (!data) {
    const indices = new Uint32Array(mesh.indices.length);
    for (let corner = 0; corner < indices.length; corner += 3) {
      indices[corner] = mesh.indices[corner];
      indices[corner + 1] = mesh.indices[corner + 2];
      indices[corner + 2] = mesh.indices[corner + 1];
    }
    data = { positions: new Float32Array(mesh.positions), indices };
    drawn.set(mesh.key, data);
  }
  return data;
};
