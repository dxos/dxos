//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { ClientPlugin } from './ClientPlugin';

describe('ClientPlugin', () => {
  test('factory exposes meta', ({ expect }) => {
    expect(ClientPlugin.meta).toBeDefined();
    expect(ClientPlugin.meta.id).toBeTypeOf('string');
  });
});
