//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { BLOCK_TYPES } from './constants.ts';

describe('BLOCK_TYPES', () => {
  test('includes the animation flow block', ({ expect }) => {
    expect(BLOCK_TYPES).toContain('flow');
  });
});
