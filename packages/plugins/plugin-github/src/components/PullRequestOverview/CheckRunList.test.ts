//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { formatDuration } from './CheckRunList.tsx';

describe('formatDuration', () => {
  const startedAt = '2026-10-08T10:00:00Z';

  test('measures a finished run from start to completion', ({ expect }) => {
    expect(formatDuration(startedAt, '2026-10-08T10:04:12Z')).toBe('4m 12s');
    expect(formatDuration(startedAt, '2026-10-08T10:00:42Z')).toBe('42s');
  });

  test('measures a running run up to now', ({ expect }) => {
    expect(formatDuration(startedAt, undefined, Date.parse('2026-10-08T10:12:05Z'))).toBe('12m 5s');
  });

  test('prefers completion over now', ({ expect }) => {
    expect(formatDuration(startedAt, '2026-10-08T10:01:00Z', Date.parse('2026-10-08T11:00:00Z'))).toBe('1m 0s');
  });

  test('is undefined without a start, or without an end of either kind', ({ expect }) => {
    expect(formatDuration(undefined, '2026-10-08T10:01:00Z')).toBeUndefined();
    expect(formatDuration(startedAt)).toBeUndefined();
  });
});
