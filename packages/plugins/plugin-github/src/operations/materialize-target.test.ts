//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { toTargetDescriptor } from './materialize-target.ts';

describe('materializeTarget', () => {
  test('reads the coordinates discovery passes in metadata', ({ expect }) => {
    const descriptor = toTargetDescriptor({
      id: '42',
      name: 'dxos/dxos',
      metadata: { id: '42', owner: 'dxos', name: 'dxos', url: 'https://github.com/dxos/dxos', defaultBranch: 'main' },
    });
    expect(descriptor).toEqual({
      id: '42',
      owner: 'dxos',
      name: 'dxos',
      url: 'https://github.com/dxos/dxos',
      defaultBranch: 'main',
    });
  });

  test('splits the owner/name label of a target without metadata', ({ expect }) => {
    expect(toTargetDescriptor({ id: '7', name: 'dxos/edge' })).toEqual({ id: '7', owner: 'dxos', name: 'edge' });
    expect(toTargetDescriptor({ id: '7', name: 'not-a-repo' })).toBeUndefined();
  });
});
