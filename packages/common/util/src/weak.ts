//
// Copyright 2023 DXOS.org
//

/**
 * Weak dictionary. It is a map that holds weak references to its values and allows garbage collection of values and keys.
 */
export class WeakDictionary<K, V extends object> implements Map<K, V> {
  private readonly _internal = new Map<K, WeakRef<V>>();
  private readonly _finalization = new FinalizationRegistry((cleanUpCallback: () => void) => {
    cleanUpCallback();
  });

  constructor(entries?: [K, V][]) {
    this._internal = new Map(entries?.map(([key, value]) => [key, new WeakRef(value)]));
    entries?.forEach(([key, value]) => this._register(key, value));
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
    this._internal.set(key, new WeakRef(value));
    this._register(key, value);
    return this;
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

  private _register(key: K, value: V): void {
    this._finalization.register(
      value,
      () => {
        this._internal.delete(key);
      },
      value,
    );
  }

  private _unregister(value: V): void {
    this._finalization.unregister(value);
  }
}
