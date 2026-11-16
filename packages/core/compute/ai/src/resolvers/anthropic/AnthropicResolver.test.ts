//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { thinkingConfig } from './AnthropicResolver.ts';

describe('thinkingConfig', () => {
  test('a thinking model thinks unless the caller turns it off', ({ expect }) => {
    expect(thinkingConfig(true, undefined)?.type).toBe('adaptive');
    expect(thinkingConfig(true, true)?.type).toBe('adaptive');
    expect(thinkingConfig(true, false)).toEqual({ type: 'disabled' });
  });

  test('a model that does not think gets no thinking field', ({ expect }) => {
    expect(thinkingConfig(false, true)).toBeUndefined();
    expect(thinkingConfig(false, false)).toBeUndefined();
  });
});
