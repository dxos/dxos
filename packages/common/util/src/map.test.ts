//
// Copyright 2020 DXOS.org
//

import { LazyMap } from './map';

describe('map', () => {
  test('set', () => {
    const map = new LazyMap<string, Set<string>>(() => new Set<string>());
    map.getOrInit('test').add('foo');
    expect(map.getOrInit('test').size).toBe(1);
  });
});
