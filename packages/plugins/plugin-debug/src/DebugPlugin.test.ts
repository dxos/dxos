//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { DebugPlugin } from './DebugPlugin';

describe('DebugPlugin', () => {
  test('factory exposes meta', ({ expect }) => {
    expect(DebugPlugin.meta).toBeDefined();
    expect(DebugPlugin.meta.id).toBeTypeOf('string');
  });
});
