//
// Copyright 2023 DXOS.org
//

/**
 * Inspired by https://doc.rust-lang.org/std/collections/struct.HashMap.html#method.entry
 */
export const entry = <K, V>(map: Map<K, V>, key: K): MapEntry<K, V, undefined> => new MapEntry(map, key);

export class MapEntry<K, V, U> {
  /**
   * @internal
   */
  // prettier-ignore
  constructor(
    private readonly _map: Map<K, V>,
    private readonly _key: K,
  ) {}

  get key(): K {
    return this._key;
  }

  get value(): V | U {
    return this._map.get(this._key) as V | U;
  }

  orInsert(value: V): MapEntry<K, V, never> {
    if (!this._map.has(this._key)) {
      this._map.set(this._key, value);
    }
    return this as any;
  }

  deep<K1, V1>(this: MapEntry<K, Map<K1, V1>, Map<K1, V1>>, key: K1): MapEntry<K1, V1, undefined> {
    return entry(this.value, key);
  }
}
