//
// Copyright 2023 DXOS.org
//

import { expect } from 'chai';

import { describe, test } from '@dxos/test';

import { median } from './reducers';

describe('Reducers', () => {
  test('median', () => {
    expect(median([1, 2, 3])).to.equal(2);
    expect(median([1, 2, 3, 4])).to.equal((2 + 3) / 2);
  });
});
