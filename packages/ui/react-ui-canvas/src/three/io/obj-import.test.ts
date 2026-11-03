//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';

import { type Scene, resolveLayout3D } from '@dxos/scene';

import { renderList } from '../render-list.ts';
import { importMesh, meshData } from './mesh.ts';
import { parseOBJ } from './obj.ts';

/** A unit cube: 8 vertices and 6 quads, which triangulate to 12 triangles. */
export const CUBE_OBJ = `# cube
v -1 -1 -1
v 1 -1 -1
v 1 1 -1
v -1 1 -1
v -1 -1 1
v 1 -1 1
v 1 1 1
v -1 1 1
f 1 2 3 4
f 5 8 7 6
f 1 5 6 2
f 2 6 7 3
f 3 7 8 4
f 5 1 4 8
`;

const document = (object: Scene.Object3D, places: number): Scene.SceneDocument => ({
  scenes: [
    {
      id: 's',
      dim: '3d',
      layout: 'l',
      camera: { target: { x: 0, y: 0, z: 0 }, yaw: 0, pitch: 30, distance: 10, fov: 0.8, projection: 'perspective' },
    },
  ],
  layouts: [
    {
      id: 'l',
      dim: '3d',
      model: 'm',
      elements: Object.fromEntries(
        Array.from({ length: places }, (_, index) => [
          `p${index}`,
          { id: `p${index}`, object: object.id, center: { x: index * 2, y: 0, z: 0 } },
        ]),
      ),
    },
  ],
  models: [{ id: 'm', dim: '3d', objects: { [object.id]: object } }],
});

describe('parseOBJ', () => {
  test('reads vertices and triangulates faces', () => {
    const parsed = parseOBJ(CUBE_OBJ);
    expect(parsed?.positions.length).toBe(8 * 3);
    expect(parsed?.indices.length).toBe(12 * 3);
  });

  test('has no mesh without faces', () => {
    expect(parseOBJ('v 0 0 0\n')).toBeUndefined();
  });
});

/** The imported object; the test fails if the import does. */
const imported = async (file: File): Promise<Scene.Object3D> => {
  const exit = await Effect.runPromiseExit(importMesh(file));
  if (exit._tag !== 'Success') {
    throw new Error(`import failed: ${String(exit.cause)}`);
  }
  return exit.value;
};

describe('importMesh', () => {
  test('an imported OBJ cube is one mesh object, unit-sized and centred, drawn as one item of 12 triangles', async () => {
    const object = await imported(new File([CUBE_OBJ], 'Box.obj'));
    expect(object).toMatchObject({ id: 'box', type: 'mesh' });
    // ECHO stores an object with exactly its schema's fields, so an import adds no others.
    expect(Object.keys(object).sort()).toEqual(['id', 'props', 'type']);
    const doc = document(object, 1);
    const { items } = renderList(doc);
    expect(items).toHaveLength(1);
    const data = meshData(items[0]);
    expect(data?.indices.length).toBe(12 * 3);
    const xs = Array.from(data?.positions ?? []).filter((_, index) => index % 3 === 0);
    expect([Math.min(...xs), Math.max(...xs)]).toEqual([-0.5, 0.5]);
  });

  test('placed twice it is still one object, and both places draw the same triangles', async () => {
    const object = await imported(new File([CUBE_OBJ], 'box.obj'));
    const doc = document(object, 2);
    expect(Object.keys(doc.models[0].objects)).toEqual(['box']);
    const layout = doc.layouts[0];
    const resolved = layout.dim === '3d' ? resolveLayout3D(doc, layout) : {};
    expect(Object.values(resolved).map((element) => element.type)).toEqual(['mesh', 'mesh']);
    const { items } = renderList(doc);
    expect(meshData(items[0])).toBe(meshData(items[1]));
  });

  test('reads a GLB file too', async () => {
    const glb = new Uint8Array(readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), 'testing/box.glb')));
    const object = await imported(new File([glb], 'box.glb'));
    expect(object.type).toBe('mesh');
    const { items } = renderList(document(object, 1));
    expect(meshData(items[0])?.indices.length).toBe(12 * 3);
  });

  test('fails on a file with no mesh in it', async () => {
    const exit = await Effect.runPromiseExit(importMesh(new File(['# nothing'], 'empty.obj')));
    expect(exit._tag).toBe('Failure');
  });
});
