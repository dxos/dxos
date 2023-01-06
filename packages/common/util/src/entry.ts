/**
 * Inspired by https://doc.rust-lang.org/std/collections/struct.HashMap.html#method.entry
 */
export function entry<K, V>(map: Map<K, V>, key: K): MapEntry<K, V, undefined> {
  return new MapEntry(map, key);
}

export class MapEntry<K, V, U> {
  /**
   * @internal
   */
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

  orInsert<U1 extends V>(value: U1): MapEntry<K, V, U1> {
    if (!this._map.has(this._key)) {
      this._map.set(this._key, value as V);
    }
    return this as any;
  }
}