//
// Copyright 2022 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { isNonNullable } from './types';

describe('types', () => {
  test('filter', async () => {
    const values = [1, 2, undefined, 3, 4];
    const filtered: number[] = values.filter(isNonNullable);
    expect(filtered).to.deep.equal([1, 2, 3, 4]);
  });
});
