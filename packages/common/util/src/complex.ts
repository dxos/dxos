//
// Copyright 2020 DXOS.org
//

import { inspect } from 'node:util';

import { inspectObject, raise } from '@dxos/debug';

export type Primitive = string | number | boolean | null | undefined;

export type PrimitiveProjection<T> = (value: T) => Primitive;

const MAX_SERIALIZATION_LENGTH = 10;

/**
 * A set implementation that can hold complex values (like Buffer).
 *
 * The user must provide a projection function which returns a primitive
 * representation of the complex value. This function must be 1-to-1 mapping.
 *
 * Look at `../complex.test.ts` for usage examples.
 */
export class ComplexSet<T> implements Set<T> {
  private readonly _values = new Map<Primitive, T>();

  // prettier-ignore
  constructor(
    private readonly _projection: PrimitiveProjection<T>,
    values?: Iterable<T> | null,
  ) {
    if (values) {
      for (const value of values) {
        this.add(value);
      }
    }
  }

  toString() {
    return inspectObject(this);
  }

  toJSON() {
    return this._values.size > MAX_SERIALIZATION_LENGTH
      ? { size: this._values.size }
      : Array.from(this._values.values());
  }

  [inspect.custom]() {
    return inspectObject(this);
  }

  add(value: T): this {
    this._values.set(this._projection(value), value);
    return this;
  }

  clear(): void {
    this._values.clear();
  }

  delete(value: T): boolean {
    return this._values.delete(this._projection(value));
  }

  forEach(callbackfn: (value: T, value2: T, set: Set<T>) => void, thisArg?: any): void {
    if (thisArg) {
      callbackfn = callbackfn.bind(thisArg);
    }

    this._values.forEach((value) => callbackfn(value, value, this));
  }

  has(value: T): boolean {
    return this._values.has(this._projection(value));
  }

  get size(): number {
    return this._values.size;
  }

  [Symbol.iterator](): IterableIterator<T> {
    return this._values.values();
  }

  *entries(): IterableIterator<[T, T]> {
    for (const value of this._values.values()) {
      yield [value, value];
    }
  }

  keys(): IterableIterator<T> {
    return this[Symbol.iterator]();
  }

  values(): IterableIterator<T> {
    return this[Symbol.iterator]();
  }

  get [Symbol.toStringTag](): string {
    return 'ComplexSet';
  }
}

export type ComplexSetConstructor<T> = new (values?: Iterable<T> | null) => ComplexSet<T>;

/**
 * Create a subclass of ComplexSet with predefined projection function.
 */
export const makeSet = <T>(projection: PrimitiveProjection<T>): ComplexSetConstructor<T> => {
  return class BoundComplexSet extends ComplexSet<T> {
    constructor(values?: Iterable<T> | null) {
      super(projection, values);
    }
  };
};

/**
 * A map implementation that can hold complex values (like Buffer) as keys.
 * The user must provide a projection function for map keys which returns a primitive
 * representation of the complex value. This function must be 1-to-1 mapping.
 * Look at `../complex.test.ts` for usage examples.
 */
export class ComplexMap<K, V> implements Map<K, V> {
  private readonly _keys = new Map<Primitive, K>();
  private readonly _values = new Map<Primitive, V>();

  // prettier-ignore
  constructor(
    private readonly _keyProjection: PrimitiveProjection<K>,
    entries?: readonly (readonly [K, V])[] | null,
  ) {
    if (entries) {
      for (const [key, value] of entries) {
        this.set(key, value);
      }
    }
  }

  toString() {
    return inspectObject(this);
  }

  toJSON() {
    return this._values.size > MAX_SERIALIZATION_LENGTH
      ? { size: this._values.size }
      : Array.from(this._values.values());
  }

  [inspect.custom]() {
    return inspectObject(this);
  }

  clear(): void {
    this._keys.clear();
    this._values.clear();
  }

  delete(key: K): boolean {
    const keyDeleted = this._keys.delete(this._keyProjection(key));
    const valueDeleted = this._values.delete(this._keyProjection(key));
    return keyDeleted || valueDeleted;
  }

  forEach(callbackfn: (value: V, key: K, map: Map<K, V>) => void, thisArg?: any): void {
    if (thisArg) {
      callbackfn = callbackfn.bind(thisArg);
    }

    this._keys.forEach((key, primitive) =>
      callbackfn(this._values.get(primitive) ?? raise(new Error('Map corrupted.')), key, this),
    );
  }

  get(key: K): V | undefined {
    return this._values.get(this._keyProjection(key));
  }

  has(key: K): boolean {
    return this._keys.has(this._keyProjection(key));
  }

  set(key: K, value: V): this {
    const primitive = this._keyProjection(key);
    this._keys.set(primitive, key);
    this._values.set(primitive, value);
    return this;
  }

  get size(): number {
    return this._keys.size;
  }

  *[Symbol.iterator](): IterableIterator<[K, V]> {
    for (const [primitive, key] of this._keys) {
      const value = this._values.get(primitive) ?? raise(new Error('Map corrupted.'));
      yield [key, value];
    }
  }

  entries(): IterableIterator<[K, V]> {
    return this[Symbol.iterator]();
  }

  keys(): IterableIterator<K> {
    return this._keys.values();
  }

  values(): IterableIterator<V> {
    return this._values.values();
  }

  mapValues<R>(mapper: (v: V, k: K) => R): ComplexMap<K, R> {
    return new ComplexMap(
      this._keyProjection,
      [...this.entries()].map(([key, value]) => [key, mapper(value, key)]),
    );
  }

  get [Symbol.toStringTag](): string {
    return 'ComplexMap';
  }
}

export type ComplexMapConstructor<K> = new <V>(entries?: readonly (readonly [K, V])[] | null) => ComplexMap<K, V>;

/**
 * Create a subclass of ComplexMap with predefined key projection function.
 */
export const makeMap = <K>(keyProjection: PrimitiveProjection<K>): ComplexMapConstructor<K> =>
  class BoundComplexMap<V> extends ComplexMap<K, V> {
    constructor(entries?: readonly (readonly [K, V])[] | null) {
      super(keyProjection, entries);
    }
  };
