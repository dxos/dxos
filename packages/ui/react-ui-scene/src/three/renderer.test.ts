//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { itemSignature } from './renderer.ts';

describe('itemSignature', () => {
  test('new geometry of the same size rebuilds the mesh', () => {
    const spec = { color: '#000000', kind: 'standard' as const, alpha: 1, edges: false };
    const mesh = () => ({ positions: new Float32Array(9), indices: new Uint32Array(3) });
    expect(itemSignature('solid', spec, mesh())).not.toBe(itemSignature('solid', spec, mesh()));
    const same = mesh();
    expect(itemSignature('solid', spec, same)).toBe(itemSignature('solid', spec, same));
  });
});
