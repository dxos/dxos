//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { ThemePlugin } from './ThemePlugin';

describe('ThemePlugin', () => {
  test('factory exposes meta', ({ expect }) => {
    expect(ThemePlugin.meta).toBeDefined();
    expect(ThemePlugin.meta.id).toBeTypeOf('string');
  });
});
