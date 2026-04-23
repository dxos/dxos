//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { SpecPlugin } from './SpecPlugin';

describe('SpecPlugin', () => {
  test('factory exposes meta', ({ expect }) => {
    expect(SpecPlugin.meta).toBeDefined();
    expect(SpecPlugin.meta.id).toBeTypeOf('string');
  });
});
