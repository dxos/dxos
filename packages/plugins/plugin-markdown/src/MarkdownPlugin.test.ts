//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { MarkdownPlugin } from './MarkdownPlugin';

describe('MarkdownPlugin', () => {
  test('factory exposes meta', ({ expect }) => {
    expect(MarkdownPlugin.meta).toBeDefined();
    expect(MarkdownPlugin.meta.id).toBeTypeOf('string');
  });
});
