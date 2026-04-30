//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { trimJsonlToSize } from './encode';

describe('trimJsonlToSize', () => {
  test('returns empty string when no input', ({ expect }) => {
    expect(trimJsonlToSize([], 100)).toBe('');
  });

  test('returns empty string when maxSize is zero', ({ expect }) => {
    expect(trimJsonlToSize(['abc'], 0)).toBe('');
  });

  test('returns full content when under cap', ({ expect }) => {
    const lines = ['a', 'bb', 'ccc'];
    // 'a\nbb\nccc' = 8 bytes.
    expect(trimJsonlToSize(lines, 100)).toBe('a\nbb\nccc');
  });

  test('trims oldest lines and keeps newest', ({ expect }) => {
    const lines = ['oldest', 'middle', 'newest'];
    // 'newest' = 6 bytes; 'middle\nnewest' = 13 bytes; full = 20 bytes.
    expect(trimJsonlToSize(lines, 13)).toBe('middle\nnewest');
    expect(trimJsonlToSize(lines, 12)).toBe('newest');
    expect(trimJsonlToSize(lines, 6)).toBe('newest');
  });

  test('drops a line that would not fit even alone', ({ expect }) => {
    const lines = ['huge-line', 'small'];
    // 'small' = 5 bytes; 'huge-line\nsmall' = 15 bytes.
    expect(trimJsonlToSize(lines, 5)).toBe('small');
    expect(trimJsonlToSize(lines, 4)).toBe('');
  });

  test('never splits a line', ({ expect }) => {
    const lines = ['{"m":"hello"}', '{"m":"world"}'];
    // Cap below either single line returns empty (lines are atomic).
    expect(trimJsonlToSize(lines, 5)).toBe('');
    // Cap fits one line exactly.
    expect(trimJsonlToSize(lines, 13)).toBe('{"m":"world"}');
  });

  test('counts utf-8 bytes for multibyte characters', ({ expect }) => {
    const lines = ['ñ', 'a'];
    // 'ñ' is 2 bytes, 'a' is 1 byte; separator '\n' is 1 byte.
    // maxSize = 3 bytes fits only 'ñ' alone (2) or 'a' alone (1) — newest 'a' takes priority,
    // then 'ñ' would need 1 (sep) + 2 (ñ) = 3 more bytes → total 4 > 3, so dropped.
    expect(trimJsonlToSize(lines, 3)).toBe('a');
    // maxSize = 4 bytes fits both: 'ñ\na' = 2+1+1 = 4 bytes.
    expect(trimJsonlToSize(lines, 4)).toBe('ñ\na');
  });
});
