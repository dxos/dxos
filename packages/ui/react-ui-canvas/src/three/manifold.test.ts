//
// Copyright 2026 DXOS.org
//

import type { ManifoldToplevel } from 'manifold-3d';
import { beforeAll, describe, expect, test } from 'vitest';

import { Dsl } from '@dxos/diagram';
import { EXEMPLARS } from '@dxos/diagram/testing';

import { manifoldGeometry } from './manifold.ts';
import { renderList } from './render-list.ts';

describe('manifoldGeometry', () => {
  let wasm: ManifoldToplevel;

  beforeAll(async () => {
    const Module = await import('manifold-3d');
    wasm = await Module.default();
    wasm.setup();
  });

  test('an equal solid in a new layout record is not rebuilt', () => {
    const geometry = manifoldGeometry(wasm);
    const first = renderList(Dsl.readScenes(EXEMPLARS.solid).document).items[0];
    const second = renderList(Dsl.readScenes(EXEMPLARS.solid).document).items[0];
    expect(second.elements).not.toBe(first.elements);
    expect(geometry(second)).toBe(geometry(first));
  });

  test('a changed solid is rebuilt', () => {
    const geometry = manifoldGeometry(wasm);
    const first = renderList(Dsl.readScenes(EXEMPLARS.solid).document).items[0];
    const changed = renderList(Dsl.readScenes(EXEMPLARS.solid.replace('distance=0.5', 'distance=1')).document).items[0];
    expect(geometry(changed)).not.toBe(geometry(first));
  });
});
