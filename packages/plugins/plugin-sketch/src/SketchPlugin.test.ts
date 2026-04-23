//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { SketchPlugin } from './SketchPlugin';

describe('SketchPlugin', () => {
  test('factory exposes meta', ({ expect }) => {
    expect(SketchPlugin.meta).toBeDefined();
    expect(SketchPlugin.meta.id).toBeTypeOf('string');
  });
});
