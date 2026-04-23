//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { MermaidPlugin } from './MermaidPlugin';

describe('MermaidPlugin', () => {
  test('factory exposes meta', ({ expect }) => {
    expect(MermaidPlugin.meta).toBeDefined();
    expect(MermaidPlugin.meta.id).toBeTypeOf('string');
  });
});
