//
// Copyright 2022 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { arrayMove, arraySwap, isNonNullable } from './types';

describe('types', () => {
  test('filter', async () => {
    const values = [1, 2, undefined, 3, 4];
    const filtered: number[] = values.filter(isNonNullable);
    expect(filtered).to.deep.equal([1, 2, 3, 4]);
  });

  test('arrayMove', () => {
    expect(arrayMove([1, 2, 3, 4], 0, 2)).to.deep.equal([2, 3, 1, 4]);
    expect(arrayMove([1, 2, 3, 4], 2, 0)).to.deep.equal([3, 1, 2, 4]);
  });

  test('arraySwap', () => {
    expect(arraySwap([1, 2, 3, 4], 0, 2)).to.deep.equal([3, 2, 1, 4]);
    expect(arraySwap([1, 2, 3, 4], 2, 0)).to.deep.equal([3, 2, 1, 4]);
  });
});
