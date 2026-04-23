//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { SheetPlugin } from './SheetPlugin';

describe('SheetPlugin', () => {
  test('factory exposes meta', ({ expect }) => {
    expect(SheetPlugin.meta).toBeDefined();
    expect(SheetPlugin.meta.id).toBeTypeOf('string');
  });
});
