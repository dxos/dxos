//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { formatElapsed } from './RecorderStatus.tsx';

describe('formatElapsed', () => {
  test('formats minutes and hours', ({ expect }) => {
    expect(formatElapsed(0)).toBe('0:00');
    expect(formatElapsed(133_400)).toBe('2:13');
    expect(formatElapsed(3_725_000)).toBe('1:02:05');
    expect(formatElapsed(-5)).toBe('0:00');
  });
});
