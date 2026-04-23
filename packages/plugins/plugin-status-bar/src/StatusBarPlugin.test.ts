//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { StatusBarPlugin } from './StatusBarPlugin';

describe('StatusBarPlugin', () => {
  test('factory exposes meta', ({ expect }) => {
    expect(StatusBarPlugin.meta).toBeDefined();
    expect(StatusBarPlugin.meta.id).toBeTypeOf('string');
  });
});
