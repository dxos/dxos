//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { formatTime } from './format-time.ts';

describe('formatTime', () => {
  const now = Date.parse('2026-10-05T12:00:00Z');

  test('is relative within the last day and absolute beyond it', ({ expect }) => {
    expect(formatTime('2026-10-05T11:55:00Z', now)).toEqual('5 minutes ago');
    expect(formatTime('2026-10-05T09:00:00Z', now)).toEqual('3 hours ago');
    expect(formatTime('2026-10-03T12:00:00Z', now)).not.toContain('ago');
  });
});
