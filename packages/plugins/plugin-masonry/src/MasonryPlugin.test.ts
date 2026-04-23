//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { MasonryPlugin } from './MasonryPlugin';

describe('MasonryPlugin', () => {
  test('factory exposes meta', ({ expect }) => {
    expect(MasonryPlugin.meta).toBeDefined();
    expect(MasonryPlugin.meta.id).toBeTypeOf('string');
  });
});
