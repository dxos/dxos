//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { NavTreePlugin } from './NavTreePlugin';

describe('NavTreePlugin', () => {
  test('factory exposes meta', ({ expect }) => {
    expect(NavTreePlugin.meta).toBeDefined();
    expect(NavTreePlugin.meta.id).toBeTypeOf('string');
  });
});
