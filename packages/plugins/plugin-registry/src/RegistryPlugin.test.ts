//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { RegistryPlugin } from './RegistryPlugin';

describe('RegistryPlugin', () => {
  test('factory exposes meta', ({ expect }) => {
    expect(RegistryPlugin.meta).toBeDefined();
    expect(RegistryPlugin.meta.id).toBeTypeOf('string');
  });
});
