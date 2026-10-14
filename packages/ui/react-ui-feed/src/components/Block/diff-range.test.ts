//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { diffRange } from './diff-range.ts';

const apply = (before: string, { from, to, insert }: ReturnType<typeof diffRange>) =>
  before.slice(0, from) + insert + before.slice(to);

describe('diffRange', () => {
  test('replaces only the span that differs', ({ expect }) => {
    const before = 'hello\n\n<delivery status="sent" />';
    const after = 'hello\n\n<delivery status="read" />';
    const change = diffRange(before, after);
    expect(change).toEqual({ from: 25, to: 29, insert: 'read' });
    expect(apply(before, change)).toBe(after);
  });

  test('handles growth, shrinkage and repeated runs', ({ expect }) => {
    for (const [before, after] of [
      ['aaa', 'aaaa'],
      ['aaaa', 'aa'],
      ['', 'abc'],
      ['abc', ''],
      ['abcabc', 'abc'],
      ['same', 'same'],
    ]) {
      expect(apply(before, diffRange(before, after))).toBe(after);
    }
  });
});
