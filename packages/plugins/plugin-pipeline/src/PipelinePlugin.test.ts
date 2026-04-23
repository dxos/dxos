//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { PipelinePlugin } from './PipelinePlugin';

describe('PipelinePlugin', () => {
  test('factory exposes meta', ({ expect }) => {
    expect(PipelinePlugin.meta).toBeDefined();
    expect(PipelinePlugin.meta.id).toBeTypeOf('string');
  });
});
