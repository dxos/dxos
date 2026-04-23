//
// Copyright 2023 DXOS.org
//

/**
 * Weak dictionary. It is a map that holds weak references to its values and allows garbage collection of values and keys.
 */
export class WeakDictionary<K, V extends object> implements Map<K, V> {
  private readonly _internal = new Map<K, WeakRef<V>>();
  private readonly _finalization = new FinalizationRegistry<{ key: K; ref: WeakRef<V> }>(({ key, ref }) => {
    if (this._internal.get(key) === ref) {
      this._internal.delete(key);
    }
  });

  constructor(entries?: [K, V][]) {
    if (entries) {
      for (const [key, value] of entries) {
        const ref = new WeakRef(value);
        this._internal.set(key, ref);
        this._register(key, value, ref);
      }
    }
  }

  *entries(): SetIterator<[K, V]> {
    for (const [key, value] of this._internal) {
      yield [key, value.deref()!];
    }
  }

  keys(): SetIterator<K> {
    return this._internal.keys();
  }

  *values(): SetIterator<V> {
    for (const value of this._internal.values()) {
      const deref = value.deref();
      if (!deref) {
        continue;
      }
      yield deref;
    }
  }

  *[Symbol.iterator](): SetIterator<[K, V]> {
    for (const [key, value] of this._internal) {
      yield [key, value.deref()!];
    }
  }

  get [Symbol.toStringTag](): string {
    return 'WeakDictionary';
  }

  get size(): number {
    return this._internal.size;
  }

  get(key: K): V | undefined {
    return this._internal.get(key)?.deref();
  }

  set(key: K, value: V): this {
    const previous = this._internal.get(key)?.deref();
    if (previous) {
      this._unregister(previous);
    }
    const ref = new WeakRef(value);
    this._internal.set(key, ref);
    this._register(key, value, ref);
    return this;
  }

  /**
   * Returns the value for the given key if present, otherwise inserts and returns the default value.
   * @param key - The key to look up or insert.
   * @param defaultValue - The value to insert if the key is not present.
   * @returns The existing or newly inserted value.
   */
  getOrInsert(key: K, defaultValue: V): V {
    const existing = this.get(key);
    if (existing !== undefined) {
      return existing;
    }
    this.set(key, defaultValue);
    return defaultValue;
  }

  /**
   * Returns the value for the given key if present, otherwise computes, inserts, and returns a new value.
   * The callback is only invoked when the key is missing.
   * @param key - The key to look up or insert.
   * @param callbackfn - Function to compute the value if the key is not present.
   * @returns The existing or newly computed value.
   */
  getOrInsertComputed(key: K, callbackfn: (key: K) => V): V {
    const existing = this.get(key);
    if (existing !== undefined) {
      return existing;
    }
    const value = callbackfn(key);
    this.set(key, value);
    return value;
  }

  has(key: K): boolean {
    return this._internal.has(key) && this._internal.get(key)!.deref() !== undefined;
  }

  delete(key: K): boolean {
    const value = this._internal.get(key)?.deref();
    if (value) {
      this._unregister(value);
    }
    return this._internal.delete(key);
  }

  clear(): void {
    this._internal.forEach((value) => {
      const v = value.deref();
      if (v) {
        this._unregister(v);
      }
    });

    this._internal.clear();
  }

  forEach(callbackfn: (value: V, key: K, map: Map<K, V>) => void, thisArg?: any): void {
    if (thisArg) {
      callbackfn = callbackfn.bind(thisArg);
    }

    this._internal.forEach((value, key) => {
      const v = value.deref();
      if (v) {
        callbackfn(v, key, this);
      }
    });
  }

  private _register(key: K, value: V, ref: WeakRef<V>): void {
    this._finalization.register(value, { key, ref }, value);
  }

  private _unregister(value: V): void {
    this._finalization.unregister(value);
  }
}
