//
// Copyright 2026 DXOS.org
//

import type { ManifoldToplevel } from 'manifold-3d';
import { beforeAll, describe, expect, test } from 'vitest';

import { Dsl } from '@dxos/diagram';
import { EXEMPLARS } from '@dxos/diagram/testing';
import { resolveLayout3D } from '@dxos/scene';

import { evaluateSolid } from '../solid.ts';
import { exportSTL } from './stl.ts';

/** The triangle count a binary STL declares after its 80-byte header. */
const triangles = (buffer: ArrayBuffer) => new DataView(buffer).getUint32(80, true);

describe('exportSTL', () => {
  let wasm: ManifoldToplevel;

  beforeAll(async () => {
    const Module = await import('manifold-3d');
    wasm = await Module.default();
    wasm.setup();
  });

  test('the solid exemplar exports the evaluated solid, as many triangles as it draws', () => {
    const { document } = Dsl.readScenes(EXEMPLARS.solid);
    const layout = document.layouts[0];
    expect(layout.dim).toBe('3d');
    if (layout.dim !== '3d') {
      return;
    }
    const evaluated = evaluateSolid(resolveLayout3D(document, layout), 'bracket', wasm);
    expect('mesh' in evaluated).toBe(true);
    const drawn = 'mesh' in evaluated ? evaluated.mesh.indices.length / 3 : 0;
    const buffer = exportSTL(document, layout.id, ['bracket'], wasm);
    expect(triangles(buffer)).toBe(drawn);
    expect(buffer.byteLength).toBe(84 + drawn * 50);
  });

  test('with no ids it exports every visible element, primitives included', () => {
    const { document } = Dsl.readScenes(EXEMPLARS.cube);
    const layout = document.layouts[0];
    const buffer = exportSTL(document, layout.id, undefined, wasm);
    expect(triangles(buffer)).toBeGreaterThan(0);
  });
});
