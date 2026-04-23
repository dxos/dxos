//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { ExcalidrawPlugin } from './SketchPlugin';

describe('ExcalidrawPlugin', () => {
  test('factory exposes meta', ({ expect }) => {
    expect(ExcalidrawPlugin.meta).toBeDefined();
    expect(ExcalidrawPlugin.meta.id).toBeTypeOf('string');
  });
});
