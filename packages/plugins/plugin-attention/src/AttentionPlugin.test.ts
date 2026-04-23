//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { AttentionPlugin } from './AttentionPlugin';

describe('AttentionPlugin', () => {
  test('factory exposes meta', ({ expect }) => {
    expect(AttentionPlugin.meta).toBeDefined();
    expect(AttentionPlugin.meta.id).toBeTypeOf('string');
  });
});
