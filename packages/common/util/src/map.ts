//
// Copyright 2020 DXOS.org
//

import assert from 'node:assert';

/**
 * Map with lazily created values.
 */
export class LazyMap<K, V> extends Map<K, V> {
  constructor(private _initFn: (key: K) => V) {
    super();
  }

  // TODO(burdon): Change to function.
  getOrInit(key: K, defaultValue: V | ((key: K) => V)): V {
    assert(key);
    if (this.has(key)) {
      return this.get(key)!;
    } else {
      let value: V;
      if (defaultValue === undefined) {
        value = this._initFn(key);
      } else if (typeof defaultValue === 'function') {
        value = (defaultValue as any)(key);
      } else {
        value = defaultValue;
      }

      this.set(key, value);
      return value;
    }
  }
}
