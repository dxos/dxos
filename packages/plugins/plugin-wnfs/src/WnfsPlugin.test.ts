//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { WnfsPlugin } from './WnfsPlugin';

describe('WnfsPlugin', () => {
  test('factory exposes meta', ({ expect }) => {
    expect(WnfsPlugin.meta).toBeDefined();
    expect(WnfsPlugin.meta.id).toBeTypeOf('string');
  });
});
