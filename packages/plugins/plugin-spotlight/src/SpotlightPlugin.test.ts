//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { SpotlightPlugin } from './SpotlightPlugin';

describe('SpotlightPlugin', () => {
  test('factory exposes meta', ({ expect }) => {
    expect(SpotlightPlugin.meta).toBeDefined();
    expect(SpotlightPlugin.meta.id).toBeTypeOf('string');
  });
});
