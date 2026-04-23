//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { PreviewPlugin } from './PreviewPlugin';

describe('PreviewPlugin', () => {
  test('factory exposes meta', ({ expect }) => {
    expect(PreviewPlugin.meta).toBeDefined();
    expect(PreviewPlugin.meta.id).toBeTypeOf('string');
  });
});
