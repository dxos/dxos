//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { diffRange, syncChange } from './diff-range.ts';

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

describe('syncChange', () => {
  const doc = (text: string) => ({
    length: text.length,
    sliceString: (from: number, to?: number) => text.slice(from, to),
    toString: () => text,
  });

  test('appends when the document is the start of the text', ({ expect }) => {
    expect(syncChange(doc('Hello'), 'Hello, world')).toEqual({ from: 5, to: 5, insert: ', world' });
  });

  test('resyncs a document that has drifted, rather than appending past its end', ({ expect }) => {
    expect(syncChange(doc('a\nb!'), 'a\nbc')).toEqual({ from: 3, to: 4, insert: 'c' });
    expect(syncChange(doc('a\nbcd'), 'a\nbc')).toEqual({ from: 4, to: 5, insert: '' });
  });

  test('resyncs a document that differs before its tail', ({ expect }) => {
    const tail = 'x'.repeat(64);
    expect(syncChange(doc(`A${tail}`), `B${tail}!`)).toEqual({ from: 0, to: 65, insert: `B${tail}!` });
  });
});
