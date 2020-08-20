//
// Copyright 2020 DXOS.org
//

import assert from 'assert';

// TODO(marik_d): Extract somewhere.
export class LazyMap<K, V> extends Map<K, V> {
  constructor (private _initFn: (key: K) => V) {
    super();
  }

  getOrInit (key: K): V {
    assert(key);

    if (this.has(key)) {
      return this.get(key)!;
    } else {
      const value = this._initFn(key);
      this.set(key, value);
      return value;
    }
  }
}
