//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { ZenPlugin } from './ZenPlugin';

describe('ZenPlugin', () => {
  test('factory exposes meta', ({ expect }) => {
    expect(ZenPlugin.meta).toBeDefined();
    expect(ZenPlugin.meta.id).toBeTypeOf('string');
  });
});
