//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { ConductorPlugin } from './ConductorPlugin';

describe('ConductorPlugin', () => {
  test('factory exposes meta', ({ expect }) => {
    expect(ConductorPlugin.meta).toBeDefined();
    expect(ConductorPlugin.meta.id).toBeTypeOf('string');
  });
});
