//
// Copyright 2022 DXOS.org
//

import { describe, test } from '@dxos/test';

import { sortMany, sortScalar, sortObject, sortString } from './sort';

const data = [
  { idx: 1, label: 'apple' },
  { idx: 2, label: 'Orange' },
  { idx: 1, label: 'lemon' },
  { idx: 2, label: 'Banana', enabled: false },
  { idx: 2, label: 'banana', enabled: true },
  { label: 'peach' }
];

describe('Queries', () => {
  test.only('sortString', async () => {
    {
      const items = data.map((item) => item.label);
      const results = items.sort(sortString());
      console.log(results);
    }

    {
      const items = data.map((item) => item.label);
      const results = items.sort(sortString(false));
      console.log(results);
    }
  });

  test.only('sortScalar', async () => {
    const items = data.map((item) => item.idx);
    const results = items.sort(sortScalar());
    console.log(results);
  });

  test.only('sortObject', async () => {
    const results = data.sort(sortObject('label', sortString()));
    console.log(results);
  });

  test.only('sortMany', async () => {
    const results = data.sort(
      sortMany([
        sortObject('idx', sortScalar(true)),
        sortObject('label', sortString()),
        sortObject('enabled', sortScalar(false))
      ])
    );
    console.log(results);
  });
});
