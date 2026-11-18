//
// Copyright 2025 DXOS.org
//

import { describe, test } from 'vitest';

import { chunkArray } from './chunk-array.ts';

describe('chunkArray', () => {
  test('splits into even chunks', ({ expect }) => {
    expect(chunkArray([1, 2, 3, 4], 2)).toEqual([
      [1, 2],
      [3, 4],
    ]);
  });

  test('keeps a shorter final chunk', ({ expect }) => {
    expect(chunkArray([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });

  test('empty input yields no chunks', ({ expect }) => {
    expect(chunkArray([], 3)).toEqual([]);
  });

  test('chunk size larger than the array yields one chunk', ({ expect }) => {
    expect(chunkArray([1, 2], 10)).toEqual([[1, 2]]);
  });

  test('does not mutate the input', ({ expect }) => {
    const input = [1, 2, 3];
    chunkArray(input, 2);
    expect(input).toEqual([1, 2, 3]);
  });
});
