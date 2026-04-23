//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { BoardPlugin } from './BoardPlugin';

describe('BoardPlugin', () => {
  test('factory exposes meta', ({ expect }) => {
    expect(BoardPlugin.meta).toBeDefined();
    expect(BoardPlugin.meta.id).toBeTypeOf('string');
  });
});
