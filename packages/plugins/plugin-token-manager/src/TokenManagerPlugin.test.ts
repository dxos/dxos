//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { TokenManagerPlugin } from './TokenManagerPlugin';

describe('TokenManagerPlugin', () => {
  test('factory exposes meta', ({ expect }) => {
    expect(TokenManagerPlugin.meta).toBeDefined();
    expect(TokenManagerPlugin.meta.id).toBeTypeOf('string');
  });
});
