//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { jumpTarget } from './TimelineBar.tsx';

describe('jumpTarget', () => {
  test('goes to the next or previous key, and to the end or start when there is none that way', ({ expect }) => {
    const keys = [1, 2];
    expect(jumpTarget(keys, 0, 30, 4, false)).toBe(1);
    expect(jumpTarget(keys, 1, 30, 4, false)).toBe(2);
    expect(jumpTarget(keys, 2, 30, 4, false)).toBe(4);
    expect(jumpTarget(keys, 3, 30, 4, true)).toBe(2);
    expect(jumpTarget(keys, 1, 30, 4, true)).toBe(0);
    expect(jumpTarget([], 2, 30, 4, false)).toBe(4);
    expect(jumpTarget([], 2, 30, 4, true)).toBe(0);
  });
});
