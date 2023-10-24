//
// Copyright 2023 DXOS.org
//

import { expect } from 'chai';

import { describe, test } from '@dxos/test';

import { inferObjectOrder } from './order';

describe('Object order', () => {
  test('inference', () => {
    expect(
      inferObjectOrder(['a', 'b', 'c'], {
        b: { value: 'bee' },
        c: { value: 'cow' },
        d: { value: 'dog' },
        a: { value: 'ant' },
      }),
    ).to.deep.equal([{ value: 'ant' }, { value: 'bee' }, { value: 'cow' }, { value: 'dog' }]);
  });
});
