//
// Copyright 2022 DXOS.org
//

import { expect } from 'chai';

import { describe, test } from '@dxos/test';

import { sortMany, sortScalar, sortObject, sortString } from './sort';

const data = [
  { i: 0, idx: 1, label: 'apple' },
  { i: 1, idx: 2, label: 'Orange' },
  { i: 2, idx: 1, label: 'lemon' },
  { i: 3, idx: 2, label: 'Banana', enabled: false },
  { i: 4, idx: 2, label: 'banana', enabled: true },
  { i: 5, label: 'peach' }
];

describe('Sort', () => {
  test('sortString', async () => {
    {
      const items = data.map((item) => item.label);
      const results = items.sort(sortString());
      expect(results).to.deep.eq(['apple', 'Banana', 'banana', 'lemon', 'Orange', 'peach']);
    }

    {
      const items = data.map((item) => item.label);
      const results = items.sort(sortString(false));
      expect(results).to.deep.eq(['peach', 'Orange', 'lemon', 'Banana', 'banana', 'apple']);
    }
  });

  test('sortScalar', async () => {
    const items = data.map((item) => item.idx);
    const results = items.sort(sortScalar());
    expect(results).to.deep.eq([1, 1, 2, 2, 2, undefined]);
  });

  test('sortObject', async () => {
    const results = [...data].sort(sortObject('label', sortString()));
    expect(results).to.deep.eq([data[0], data[3], data[4], data[2], data[1], data[5]]);
  });

  test('sortMany', async () => {
    const results = [...data].sort(
      sortMany([
        sortObject('idx', sortScalar(true)),
        sortObject('label', sortString()),
        sortObject('enabled', sortScalar(false))
      ])
    );
    expect(results).to.deep.eq([data[0], data[2], data[4], data[3], data[1], data[5]]);
  });
});
