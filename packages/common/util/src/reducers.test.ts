//
// Copyright 2023 DXOS.org
//

import { expect } from 'chai';
import { describe, test } from 'vitest';

import { median, numericalValues } from './reducers';

describe('Reducers', () => {
  test('median', () => {
    expect(median([1, 2, 3])).to.equal(2);
    expect(median([1, 2, 3, 4])).to.equal((2 + 3) / 2);
  });

  test('numerical values', () => {
    const objects = [{ value: 1 }, { value: 2 }, { value: 3 }];
    const values = numericalValues<{ value: number }>(objects, 'value');
    expect(values).to.deep.eq({
      min: 1,
      max: 3,
      mean: 2,
      median: 2,
      total: 6,
      count: 3,
    });
  });
});
