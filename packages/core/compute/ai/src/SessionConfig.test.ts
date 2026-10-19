//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import * as SessionConfig from './SessionConfig.ts';

describe('SessionConfig', () => {
  test('a chat without a harness runs Composer', ({ expect }) => {
    expect(SessionConfig.harnessOf(undefined)).toBe(SessionConfig.COMPOSER_HARNESS);
    expect(SessionConfig.harnessOf({})).toBe(SessionConfig.COMPOSER_HARNESS);
    expect(SessionConfig.harnessOf({ harness: 'claude-code' })).toBe('claude-code');
  });
});
