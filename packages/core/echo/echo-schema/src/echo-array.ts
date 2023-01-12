//
// Copyright 2022 DXOS.org
//

import assert from 'node:assert';

import { ObjectModel, OrderedArray, Reference } from '@dxos/object-model';

import { base, id } from './defs';
import { Document } from './document';
import { EchoObject } from './object';

const isIndex = (property: string | symbol): property is string =>
  typeof property === 'string' && parseInt(property).toString() === property;

/**
 *
 */
export class EchoArray<T> implements Array<T> {
  static get [Symbol.species]() {
    return Array;
  }

  private readonly _uninitialized?: T[] = [];

  private _object?: Document;
  private _property?: string;

  [base]: EchoArray<T> = this;

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
    const model = this._getBackingModel();
    if (model) {
      const array = model.get(this._property!);
      if (!array) {
        return 0;
      }
      assert(array instanceof OrderedArray);
      return array.array.length;
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
    return Array.from(this.values()).slice(start, end);
  }

  sort(compareFn?: ((a: T, b: T) => number) | undefined): this {
    throw new Error('Method not implemented.');
  }

  splice(start: number, deleteCount?: number | undefined): T[];
  splice(start: number, deleteCount: number, ...items: T[]): T[];
  splice(start: number, deleteCount?: number | undefined, ...items: T[]): T[] {
    const model = this._getBackingModel();
    if (model) {
      const deletedItems = deleteCount !== undefined ? this.slice(start, start + deleteCount) : [];

      void model
        .builder()
        .arrayDelete(this._property!, start, deleteCount)
        .arrayInsert(
          this._property!,
          start,
          items.map((item) => this._encode(item))
        )
        .commit();

      return deletedItems;
    } else {
      assert(this._uninitialized);
      // TODO(burdon): Check param types.
      return this._uninitialized.splice(start as number, deleteCount as number, ...(items as any[]));
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
    return Array.from(this.values()).indexOf(searchElement, fromIndex);
  }

  lastIndexOf(searchElement: T, fromIndex?: number | undefined): number {
    return Array.from(this.values()).lastIndexOf(searchElement, fromIndex);
  }

  every<S extends T>(predicate: (value: T, index: number, array: T[]) => value is S, thisArg?: any): this is S[];
  every(predicate: (value: T, index: number, array: T[]) => unknown, thisArg?: any): boolean;
  every(predicate: any, thisArg?: unknown): boolean {
    return Array.from(this.values()).every(predicate, thisArg);
  }

  some(predicate: (value: T, index: number, array: T[]) => unknown, thisArg?: any): boolean {
    return Array.from(this.values()).some(predicate, thisArg);
  }

  forEach(callbackfn: (value: T, index: number, array: T[]) => void, thisArg?: any): void {
    Array.from(this.values()).forEach(callbackfn, thisArg);
  }

  map<U>(callbackfn: (value: T, index: number, array: T[]) => U, thisArg?: any): U[] {
    return Array.from(this.values()).map(callbackfn, thisArg);
  }

  filter<S extends T>(predicate: (value: T, index: number, array: T[]) => value is S, thisArg?: any): S[];
  filter(predicate: (value: T, index: number, array: T[]) => unknown, thisArg?: any): T[];
  filter<S extends T>(predicate: any, thisArg?: unknown): T[] | S[] {
    return Array.from(this.values()).filter(predicate, thisArg);
  }

  reduce(callbackfn: (previousValue: T, currentValue: T, currentIndex: number, array: T[]) => T): T;
  reduce(callbackfn: (previousValue: T, currentValue: T, currentIndex: number, array: T[]) => T, initialValue: T): T;
  reduce<U>(callbackfn: (previousValue: U, currentValue: T, currentIndex: number, array: T[]) => U, initialValue: U): U;
  reduce<U>(callbackfn: any, initialValue?: any): T | U {
    return Array.from(this.values()).reduce(callbackfn, initialValue);
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

  reduceRight<U>(callbackfn: any, initialValue?: any): T | U {
    return Array.from(this.values()).reduceRight(callbackfn, initialValue);
  }

  find<S extends T>(
    predicate: (this: void, value: T, index: number, obj: T[]) => value is S,
    thisArg?: any
  ): S | undefined;

  find(predicate: (value: T, index: number, obj: T[]) => unknown, thisArg?: any): T | undefined;
  find<S extends T>(predicate: any, thisArg?: any): T | S | undefined {
    return Array.from(this.values()).find(predicate, thisArg);
  }

  findIndex(predicate: (value: T, index: number, obj: T[]) => unknown, thisArg?: any): number {
    return Array.from(this.values()).findIndex(predicate, thisArg);
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
    const model = this._getBackingModel();
    if (model) {
      const array = model.get(this._property!);
      if (!array) {
        return [][Symbol.iterator]();
      }
      assert(array instanceof OrderedArray);

      return array
        .toArray()
        .map((value: string) => this._decode(value))
        .filter(Boolean)
        .values();
    } else {
      assert(this._uninitialized);
      return this._uninitialized[Symbol.iterator]();
    }
  }

  includes(searchElement: T, fromIndex?: number | undefined): boolean {
    return Array.from(this.values()).includes(searchElement, fromIndex);
  }

  flatMap<U, This = undefined>(
    callback: (this: This, value: T, index: number, array: T[]) => U | readonly U[],
    thisArg?: This | undefined
  ): U[] {
    return Array.from(this.values()).flatMap(callback, thisArg);
  }

  flat<A, D extends number = 1>(this: A, depth?: D | undefined): FlatArray<A, D>[] {
    throw new Error('Method not implemented.');
  }

  at(index: number): T | undefined {
    const trueIndex = index < 0 ? this.length + index : index;
    return this._get(trueIndex);
  }

  push(...items: T[]) {
    const model = this._getBackingModel();
    if (model) {
      void model
        .builder()
        .arrayPush(
          this._property!,
          items.map((item) => this._encode(item))
        )
        .commit();
    } else {
      assert(this._uninitialized);
      this._uninitialized.push(...items);
    }

    return this.length;
  }

  //
  // Impl.
  //

  private _getBackingModel(): ObjectModel | undefined {
    return this._object?._item?.model;
  }

  private _decode(value: any): T | undefined {
    if (value instanceof Reference) {
      return this._object!._database!.getObjectById(value.itemId) as T | undefined;
    } else {
      return value;
    }
  }

  private _encode(value: T) {
    if (value instanceof EchoObject) {
      void this._object!._database!.save(value);
      return new Reference(value[id]);
    } else {
      return value;
    }
  }

  /**
   * @internal
   */
  _bind(object: Document, property: string) {
    this._object = object;
    this._property = property;
    assert(this._uninitialized);

    const model = this._getBackingModel()!;
    if (!(model.get(this._property!) instanceof OrderedArray)) {
      void model.set(this._property!, OrderedArray.fromValues(this._uninitialized.map((value) => this._encode(value))));
    }

    return this;
  }

  private _get(index: number): T | undefined {
    if (this._getBackingModel()) {
      return this._getModel(index);
    } else {
      assert(this._uninitialized);
      return this._uninitialized[index];
    }
  }

  private _set(index: number, value: T) {
    if (this._getBackingModel()) {
      this._setModel(index, value);
    } else {
      assert(this._uninitialized);
      this._uninitialized[index] = value;
    }
  }

  private _getModel(index: number): T | undefined {
    const model = this._getBackingModel()!;
    const array = model.get(this._property!);
    assert(array instanceof OrderedArray);

    return this._decode(array.get(index)) as T | undefined;
  }

  private _setModel(index: number, value: T) {
    const model = this._getBackingModel()!;
    void model
      .builder()
      .arrayDelete(this._property!, index)
      .arrayInsert(this._property!, index, [this._encode(value)])
      .commit();
  }
}
