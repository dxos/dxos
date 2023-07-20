//
// Copyright 2020 DXOS.org
//

import invariant from 'tiny-invariant';

/**
 * Map with lazily created values.
 */
// TODO(burdon): Create multi-map (e.g., map of sets)?
export class LazyMap<K, V> extends Map<K, V> {
  constructor(private _initFn: (key: K) => V) {
    super();
  }

  getOrInit(key: K): V {
    invariant(key);

    if (this.has(key)) {
      return this.get(key)!;
    } else {
      const value = this._initFn(key);
      this.set(key, value);
      return value;
    }
  }
}
