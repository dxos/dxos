//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { pollDelay } from './pollDelay.ts';

describe('pollDelay', () => {
  test('keeps the base interval while reads succeed and doubles per failure up to a minute', ({ expect }) => {
    expect(pollDelay(3_000, 0)).toBe(3_000);
    expect(pollDelay(3_000, 1)).toBe(6_000);
    expect(pollDelay(3_000, 3)).toBe(24_000);
    expect(pollDelay(3_000, 10)).toBe(60_000);
  });
});
