//
// Copyright 2024 DXOS.org
//

import { expect } from 'chai';

import { describe, test } from '@dxos/test';

import { UniqueNames } from './util';

describe('Utils', () => {
  test('unique', () => {
    const uniqueNames = new UniqueNames();
    expect(uniqueNames.unique('foo')).to.equal('foo');
    expect(uniqueNames.unique('foo')).to.equal('foo_1');
    // TODO(burdon): Check for collisions.
    // expect(uniqueNames.unique('foo_1')).to.equal('foo_2');
  });
});
