//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { TemplatePlugin } from './TemplatePlugin';

describe('TemplatePlugin', () => {
  test('factory exposes meta', ({ expect }) => {
    expect(TemplatePlugin.meta).toBeDefined();
    expect(TemplatePlugin.meta.id).toBeTypeOf('string');
  });
});
