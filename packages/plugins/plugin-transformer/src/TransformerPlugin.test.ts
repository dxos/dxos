//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { TransformerPlugin } from './TransformerPlugin';

describe('TransformerPlugin', () => {
  test('factory exposes meta', ({ expect }) => {
    expect(TransformerPlugin.meta).toBeDefined();
    expect(TransformerPlugin.meta.id).toBeTypeOf('string');
  });
});
