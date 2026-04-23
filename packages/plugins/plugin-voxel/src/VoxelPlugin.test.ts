//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { VoxelPlugin } from './VoxelPlugin';

describe('VoxelPlugin', () => {
  test('factory exposes meta', ({ expect }) => {
    expect(VoxelPlugin.meta).toBeDefined();
    expect(VoxelPlugin.meta.id).toBeTypeOf('string');
  });
});
