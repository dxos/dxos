//
// Copyright 2020 DXOS.org
//

import { expect } from 'chai';

import { LazyMap } from '../src/map.js';

describe('map', function () {
  it('set', function () {
    const map = new LazyMap<string, Set<string>>(() => new Set<string>());
    map.getOrInit('test').add('foo');
    expect(map.getOrInit('test').size).to.equal(1);
  });
});
