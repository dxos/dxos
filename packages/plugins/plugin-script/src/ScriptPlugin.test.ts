//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { ScriptPlugin } from './ScriptPlugin';

describe('ScriptPlugin', () => {
  test('factory exposes meta', ({ expect }) => {
    expect(ScriptPlugin.meta).toBeDefined();
    expect(ScriptPlugin.meta.id).toBeTypeOf('string');
  });
});
