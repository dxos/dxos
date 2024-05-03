//
// Copyright 2023 DXOS.org
//

import { expect } from 'chai';
import { describe, test } from 'vitest';

import { inferObjectOrder, inferRecordOrder } from './order';

describe('Object order', () => {
  test('infers correct order for nonempty record & order', () => {
    expect(
      inferObjectOrder(
        {
          b: { value: 'bee' },
          c: { value: 'cow' },
          d: { value: 'dog' },
          a: { value: 'ant' },
        },
        ['a', 'b', 'c'],
      ),
    ).to.deep.equal([{ value: 'ant' }, { value: 'bee' }, { value: 'cow' }, { value: 'dog' }]);
  });
  test('infers correct order for nonempty record & empty order', () => {
    expect(
      inferObjectOrder({
        b: { value: 'bee' },
        c: { value: 'cow' },
        d: { value: 'dog' },
        a: { value: 'ant' },
      }),
    ).to.deep.equal([{ value: 'bee' }, { value: 'cow' }, { value: 'dog' }, { value: 'ant' }]);
  });
  test('infers correct order for empty record & nonempty order', () => {
    expect(inferObjectOrder({}, ['a', 'b', 'c'])).to.deep.equal([]);
  });
  test('infers correct record order', () => {
    expect(
      Object.keys(
        inferRecordOrder(
          {
            b: { value: 'bee' },
            c: { value: 'cow' },
            d: { value: 'dog' },
            a: { value: 'ant' },
          },
          ['a', 'z', 'c', 'b'],
        ),
      ),
    ).to.deep.equal(['a', 'c', 'b', 'd']);
  });
});
