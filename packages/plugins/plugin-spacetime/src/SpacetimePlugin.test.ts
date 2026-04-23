//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { SpacetimePlugin } from './SpacetimePlugin';

describe('SpacetimePlugin', () => {
  test('factory exposes meta', ({ expect }) => {
    expect(SpacetimePlugin.meta).toBeDefined();
    expect(SpacetimePlugin.meta.id).toBeTypeOf('string');
  });
});
