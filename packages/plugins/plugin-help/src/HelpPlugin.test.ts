//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { HelpPlugin } from './HelpPlugin';

describe('HelpPlugin', () => {
  test('factory exposes meta', ({ expect }) => {
    expect(HelpPlugin.meta).toBeDefined();
    expect(HelpPlugin.meta.id).toBeTypeOf('string');
  });
});
