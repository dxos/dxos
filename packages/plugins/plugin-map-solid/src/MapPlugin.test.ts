//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { MapPlugin } from './MapPlugin';

describe('MapPlugin (solid)', () => {
  test('factory exposes meta', ({ expect }) => {
    expect(MapPlugin.meta).toBeDefined();
    expect(MapPlugin.meta.id).toBeTypeOf('string');
  });
});
