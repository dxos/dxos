//
// Copyright 2022 DXOS.org
//

import assert from 'node:assert';

import { OrderedList } from '@dxos/object-model';

import { base, id } from './defs';
import { Document, DocumentBase } from './document';

// TODO(burdon): Remove?
const EMPTY = '__EMPTY__';

const isIndex = (property: string | symbol): property is string =>
  typeof property === 'string' && parseInt(property).toString() === property;

/**
 *
 */
// TODO(burdon): Implement subset of Array.
export class OrderedSet<T extends DocumentBase> implements Array<T> {
  static get [Symbol.species]() {
    return Array;
  }

  private readonly _uninitialized?: T[] = [];

  private _object?: Document;
  private _property?: string;

  // TODO(burdon): Rename/move OrderedList to this module as util (deprecate from object-model?)
  private _orderedList?: OrderedList;

  [base]: OrderedSet<T> = this;

  [n: number]: T;

  [Symbol.iterator](): IterableIterator<T> {
    return this.values();
  }

  [Symbol.unscopables](): {
    copyWithin: boolean;
    entries: boolean;
    fill: boolean;
    find: boolean;
    findIndex: boolean;
    keys: boolean;
    values: boolean;
  } {
    throw new Error('Method not implemented.');
  }

  constructor(items: T[] = []) {
    this._uninitialized = [...items];

    // Change type returned by `new`.
    return new Proxy(this, {
      get: (target, property, receiver) => {
        if (isIndex(property)) {
          return this._get(+property);
        } else {
          return Reflect.get(target, property, receiver);
        }
      },

      set: (target, property, value, receiver) => {
        if (isIndex(property)) {
          this._set(+property, value);
          return true;
        } else {
          return Reflect.set(target, property, value, receiver);
        }
      }
    });
  }

  get length(): number {
    if (this._orderedList) {
      return Math.max(this._orderedList.values.length - 1, 0); // Account for empty item.
    } else {
      assert(this._uninitialized);
      return this._uninitialized.length;
    }
  }

  toString(): string {
    throw new Error('Method not implemented.');
  }

  toLocaleString(): string {
    throw new Error('Method not implemented.');
  }

  pop(): T | undefined {
    throw new Error('Method not implemented.');
  }

  concat(...items: ConcatArray<T>[]): T[];
  concat(...items: (T | ConcatArray<T>)[]): T[];
  concat(...items: unknown[]): T[] {
    throw new Error('Method not implemented.');
  }

  join(separator?: string | undefined): string {
    throw new Error('Method not implemented.');
  }

  reverse(): T[] {
    throw new Error('Method not implemented.');
  }

  shift(): T | undefined {
    throw new Error('Method not implemented.');
  }

  slice(start?: number | undefined, end?: number | undefined): T[] {
    throw new Error('Method not implemented.');
  }

  sort(compareFn?: ((a: T, b: T) => number) | undefined): this {
    throw new Error('Method not implemented.');
  }

  // TODO(burdon): Double linked list.
  splice(start: number, deleteCount?: number | undefined): T[];
  splice(start: number, deleteCount: number, ...items: T[]): T[];
  splice(start: number, deleteCount?: number | undefined, ...items: unknown[]): T[] {
    if (this._orderedList) {
      if (deleteCount !== undefined && deleteCount > 0) {
        throw new Error('deleteCount not supported.');
      }

      for (let i = 0; i < items.length; i++) {
        const idx = start + i;
        const itemId = typeof items[i] === 'string' ? items[i] : (items[i] as any)[id];
        if (idx === 0) {
          // console.log('insert', itemId, this._orderedList.values[0])
          void this._orderedList.insert(itemId, this._orderedList.values[0]);
        } else {
          // console.log('insert', this._orderedList.values[idx - 1], itemId)
          void this._orderedList.insert(this._orderedList.values[idx - 1], itemId);
        }
      }

      return [];
    } else {
      assert(this._uninitialized);
      // TODO(burdon): Check param types.
      this._uninitialized.splice(start as number, deleteCount as number, ...(items as any[]));
      return this._uninitialized;
    }

    // console.log({
    //   links: (this._orderedList as any)._model.get((this._orderedList as any)._property) ?? {},
    //   values: this._orderedList.values
    // })
  }

  unshift(...items: T[]): number {
    throw new Error('Method not implemented.');
  }

  indexOf(searchElement: T, fromIndex?: number | undefined): number {
    if (this._orderedList) {
      const itemId = typeof searchElement === 'string' ? searchElement : (searchElement as any)[id];
      if (!itemId) {
        return -1;
      }

      return this._orderedList.values.indexOf(itemId);
    } else {
      assert(this._uninitialized);
      return this._uninitialized.indexOf(searchElement);
    }
  }

  lastIndexOf(searchElement: T, fromIndex?: number | undefined): number {
    throw new Error('Method not implemented.');
  }

  every<S extends T>(predicate: (value: T, index: number, array: T[]) => value is S, thisArg?: any): this is S[];
  every(predicate: (value: T, index: number, array: T[]) => unknown, thisArg?: any): boolean;
  every(predicate: unknown, thisArg?: unknown): boolean {
    throw new Error('Method not implemented.');
  }

  some(predicate: (value: T, index: number, array: T[]) => unknown, thisArg?: any): boolean {
    throw new Error('Method not implemented.');
  }

  forEach(callbackfn: (value: T, index: number, array: T[]) => void, thisArg?: any): void {
    Array.from(this[Symbol.iterator]()).forEach(callbackfn, thisArg);
  }

  map<U>(callbackfn: (value: T, index: number, array: T[]) => U, thisArg?: any): U[] {
    return Array.from(this[Symbol.iterator]()).map(callbackfn, thisArg);
  }

  filter<S extends T>(predicate: (value: T, index: number, array: T[]) => value is S, thisArg?: any): S[];
  filter(predicate: (value: T, index: number, array: T[]) => unknown, thisArg?: any): T[];
  filter<S extends T>(predicate: unknown, thisArg?: unknown): T[] | S[] {
    throw new Error('Method not implemented.');
  }

  reduce(callbackfn: (previousValue: T, currentValue: T, currentIndex: number, array: T[]) => T): T;
  reduce(callbackfn: (previousValue: T, currentValue: T, currentIndex: number, array: T[]) => T, initialValue: T): T;
  reduce<U>(callbackfn: (previousValue: U, currentValue: T, currentIndex: number, array: T[]) => U, initialValue: U): U;
  reduce<U>(callbackfn: unknown, initialValue?: unknown): T | U {
    throw new Error('Method not implemented.');
  }

  reduceRight(callbackfn: (previousValue: T, currentValue: T, currentIndex: number, array: T[]) => T): T;
  reduceRight(
    callbackfn: (previousValue: T, currentValue: T, currentIndex: number, array: T[]) => T,
    initialValue: T
  ): T;

  reduceRight<U>(
    callbackfn: (previousValue: U, currentValue: T, currentIndex: number, array: T[]) => U,
    initialValue: U
  ): U;

  reduceRight<U>(callbackfn: unknown, initialValue?: unknown): T | U {
    throw new Error('Method not implemented.');
  }

  find<S extends T>(
    predicate: (this: void, value: T, index: number, obj: T[]) => value is S,
    thisArg?: any
  ): S | undefined;

  find(predicate: (value: T, index: number, obj: T[]) => unknown, thisArg?: any): T | undefined;
  find<S extends T>(predicate: unknown, thisArg?: unknown): T | S | undefined {
    throw new Error('Method not implemented.');
  }

  findIndex(predicate: (value: T, index: number, obj: T[]) => unknown, thisArg?: any): number {
    return Array.from(this[Symbol.iterator]()).findIndex(predicate, thisArg);
  }

  fill(value: T, start?: number | undefined, end?: number | undefined): this {
    throw new Error('Method not implemented.');
  }

  copyWithin(target: number, start: number, end?: number | undefined): this {
    throw new Error('Method not implemented.');
  }

  entries(): IterableIterator<[number, T]> {
    throw new Error('Method not implemented.');
  }

  keys(): IterableIterator<number> {
    throw new Error('Method not implemented.');
  }

  values(): IterableIterator<T> {
    if (this._orderedList) {
      return this._orderedList.values
        .filter((x) => x !== '__EMPTY__')
        .map((id) => this._object!._database!.getObjectById(id) as T)
        .filter(Boolean)
        .values();
    } else {
      assert(this._uninitialized);
      return this._uninitialized[Symbol.iterator]();
    }
  }

  includes(searchElement: T, fromIndex?: number | undefined): boolean {
    throw new Error('Method not implemented.');
  }

  flatMap<U, This = undefined>(
    callback: (this: This, value: T, index: number, array: T[]) => U | readonly U[],
    thisArg?: This | undefined
  ): U[] {
    throw new Error('Method not implemented.');
  }

  flat<A, D extends number = 1>(this: A, depth?: D | undefined): FlatArray<A, D>[] {
    throw new Error('Method not implemented.');
  }

  at(index: number): T | undefined {
    throw new Error('Method not implemented.');
  }

  push(...items: T[]) {
    if (this._orderedList) {
      for (const item of items) {
        this._setModel(this.length, item);
      }
    } else {
      assert(this._uninitialized);
      this._uninitialized.push(...items);
    }

    // console.log({
    //   links: (this._orderedList as any)._model.get((this._orderedList as any)._property) ?? {},
    //   values: this._orderedList!.values
    // })

    return this.length;
  }

  //
  // Impl.
  //

  _bind(object: Document, property: string) {
    this._object = object;
    this._property = property;
    this._orderedList = new OrderedList(this._object!._item!.model, this._property!);
    this._orderedList.refresh();
    assert(this._uninitialized);
    for (const item of this._uninitialized) {
      this.push(item);
    }

    return this;
  }

  private _get(index: number): T | undefined {
    if (this._orderedList) {
      return this._getModel(index);
    } else {
      assert(this._uninitialized);
      return this._uninitialized[index];
    }
  }

  private _set(index: number, value: T) {
    if (this._orderedList) {
      this._setModel(index, value);
    } else {
      assert(this._uninitialized);
      this._uninitialized[index] = value;
    }
  }

  private _getModel(index: number): T | undefined {
    const id = this._orderedList!.values[index];
    if (!id) {
      return undefined;
    }

    return this._object!._database!.getObjectById(id) as T | undefined;
  }

  private _setModel(index: number, value: T) {
    void this._object!._database!.save(value);

    if (this._orderedList!.values.length === 0) {
      void this._orderedList!.init([value[base]._id, EMPTY]);
    } else {
      const prev = this._orderedList?.values[index - 1];
      if (prev) {
        void this._orderedList!.insert(prev, value[base]._id);
      } else {
        const next = this._orderedList?.values[index + 1];
        if (!next) {
          throw new Error();
        }

        const item = this._orderedList?.values[index];
        if (item) {
          void this._orderedList!.remove([item]);
        }

        void this._orderedList!.insert(value[base]._id, next);
      }
    }
  }
}
