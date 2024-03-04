//
// Copyright 2022 DXOS.org
//

import { expect } from 'chai';
import { describe, test } from 'vitest';

import { nonNullable } from './types';

describe('types', () => {
  test('filter', async () => {
    const values = [1, 2, undefined, 3, 4];
    const filtered: number[] = values.filter(nonNullable);
    expect(filtered).to.deep.equal([1, 2, 3, 4]);
  });
});
