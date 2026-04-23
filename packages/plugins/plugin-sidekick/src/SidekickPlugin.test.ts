//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { SidekickPlugin } from './SidekickPlugin';

describe('SidekickPlugin', () => {
  test('factory exposes meta', ({ expect }) => {
    expect(SidekickPlugin.meta).toBeDefined();
    expect(SidekickPlugin.meta.id).toBeTypeOf('string');
  });
});
