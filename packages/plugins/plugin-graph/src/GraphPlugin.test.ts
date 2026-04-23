//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { GraphPlugin } from './GraphPlugin';

describe('GraphPlugin', () => {
  test('factory exposes meta', ({ expect }) => {
    expect(GraphPlugin.meta).toBeDefined();
    expect(GraphPlugin.meta.id).toBeTypeOf('string');
  });
});
