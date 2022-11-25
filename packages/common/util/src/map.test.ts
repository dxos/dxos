//
// Copyright 2020 DXOS.org
//

import { expect } from 'chai';

import { describe, test } from '@dxos/test';

import { LazyMap } from '../src/map';

describe('map', function () {
  test('set', function () {
    const map = new LazyMap<string, Set<string>>(() => new Set<string>());
    map.getOrInit('test').add('foo');
    expect(map.getOrInit('test').size).to.equal(1);
  });
});
