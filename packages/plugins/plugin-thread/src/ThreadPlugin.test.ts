//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { ThreadPlugin } from './ThreadPlugin';

describe('ThreadPlugin', () => {
  test('factory exposes meta', ({ expect }) => {
    expect(ThreadPlugin.meta).toBeDefined();
    expect(ThreadPlugin.meta.id).toBeTypeOf('string');
  });
});
