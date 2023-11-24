//
// Copyright 2023 DXOS.org
//

import { inspect, type CustomInspectFunction } from 'node:util';

import { type ChangeFn } from '@dxos/automerge/automerge';
import { invariant } from '@dxos/invariant';

import { AutomergeObject } from './automerge-object';
import { base } from '../object';

const isIndex = (property: string | symbol): property is string =>
  typeof property === 'string' && parseInt(property).toString() === property;

export class AutomergeArray<T> implements Array<T> {
  /**
   * Until this array is attached a document, the items are stored in this array.
   */
  private _uninitialized?: T[] = [];

  private _object?: AutomergeObject;
  private _path?: string[];

  [base]: AutomergeArray<T> = this;

  [n: number]: T;

  [Symbol.iterator](): IterableIterator<T> {
    return this.values();
  }

  get [Symbol.unscopables](): any {
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
      },
    });
  }

  get length(): number {
    if (this._object) {
      const array = this._getArray();
      if (!array) {
        return 0;
      }
      return array.length;
    } else {
      invariant(this._uninitialized);
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
    if (this._object) {
      invariant(this._object?.[base] instanceof AutomergeObject);
      const deletedItems = deleteCount !== undefined ? this.slice(start, start + deleteCount) : [];

      const fullPath = [...this._object._path, ...this._path!];

      // TODO(mykola): Do not allow direct access to doc in array.
      const changeFn: ChangeFn<any> = (doc) => {
        let parent = doc;
        for (const key of fullPath.slice(0, -1)) {
          parent = parent[key];
        }
        const array: any[] = parent[fullPath.at(-1)!];
        invariant(Array.isArray(array));
        array.splice(start, deleteCount ?? 0, ...items.map((value) => this._object!._encode(value)));
      };
      this._object._change(changeFn);
      return deletedItems;
    } else {
      invariant(this._uninitialized);
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
    initialValue: T,
  ): T;

  reduceRight<U>(
    callbackfn: (previousValue: U, currentValue: T, currentIndex: number, array: T[]) => U,
    initialValue: U,
  ): U;

  reduceRight<U>(callbackfn: any, initialValue?: any): T | U {
    return Array.from(this.values()).reduceRight(callbackfn, initialValue);
  }

  find<S extends T>(
    predicate: (this: void, value: T, index: number, obj: T[]) => value is S,
    thisArg?: any,
  ): S | undefined;

  find(predicate: (value: T, index: number, obj: T[]) => unknown, thisArg?: any): T | undefined;
  find<S extends T>(predicate: any, thisArg?: any): T | S | undefined {
    return Array.from(this.values()).find(predicate, thisArg);
  }

  findIndex(predicate: (value: T, index: number, obj: T[]) => unknown, thisArg?: any): number {
    return Array.from(this.values()).findIndex(predicate, thisArg);
  }

  findLast<S extends T>(predicate: (value: T, index: number, array: T[]) => value is S, thisArg?: any): S | undefined;
  findLast(predicate: (value: T, index: number, array: T[]) => unknown, thisArg?: any): T | undefined;
  findLast(predicate: any, thisArg?: any): T | undefined {
    return Array.from(this.values()).findLast(predicate, thisArg);
  }

  findLastIndex(predicate: (value: T, index: number, array: T[]) => unknown, thisArg?: any): number {
    return Array.from(this.values()).findLastIndex(predicate, thisArg);
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
    if (this._object) {
      invariant(this._object?.[base] instanceof AutomergeObject);

      const array = this._getArray();
      if (!array) {
        return [][Symbol.iterator]();
      }

      return (array.filter(Boolean) as T[]).values();
    } else {
      invariant(this._uninitialized);
      return this._uninitialized[Symbol.iterator]();
    }
  }

  includes(searchElement: T, fromIndex?: number | undefined): boolean {
    return Array.from(this.values()).includes(searchElement, fromIndex);
  }

  flatMap<U, This = undefined>(
    callback: (this: This, value: T, index: number, array: T[]) => U | readonly U[],
    thisArg?: This | undefined,
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
    if (this._object) {
      const fullPath = [...this._object._path, ...this._path!];

      // TODO(mykola): Do not allow direct access to doc in array.
      const changeFn: ChangeFn<any> = (doc) => {
        let parent = doc;
        for (const key of fullPath.slice(0, -1)) {
          parent = parent[key];
        }
        const array: any[] = parent[fullPath.at(-1)!];
        invariant(Array.isArray(array));

        array.push(...items.map((value) => this._object!._encode(value)));
      };
      this._object._change(changeFn);
    } else {
      invariant(this._uninitialized);
      this._uninitialized.push(...items);
    }

    return this.length;
  }

  [inspect.custom]: CustomInspectFunction = (depth, options) => {
    const data = this.slice();

    return inspect(data, { ...options, depth: typeof options.depth === 'number' ? options.depth - 1 : options.depth });
  };

  toReversed(): T[] {
    throw new Error('Method not implemented.');
  }

  toSorted(compareFn?: ((a: T, b: T) => number) | undefined): T[] {
    throw new Error('Method not implemented.');
  }

  toSpliced(start: number, deleteCount: number, ...items: T[]): T[];
  toSpliced(start: number, deleteCount?: number | undefined): T[];
  toSpliced(start: unknown, deleteCount?: unknown, ...items: unknown[]): T[] {
    throw new Error('Method not implemented.');
  }

  with(index: number, value: T): T[] {
    throw new Error('Method not implemented.');
  }

  //
  // Impl.
  //

  /**
   * @internal
   */
  _attach(document: AutomergeObject, path: string[]) {
    this._object = document;
    this._path = path;
    this._uninitialized = undefined;
    return this;
  }

  private _get(index: number): T | undefined {
    if (this._object) {
      return this._getModel(index);
    } else {
      invariant(this._uninitialized);
      return this._uninitialized[index];
    }
  }

  private _set(index: number, value: T) {
    if (this._object) {
      this._setModel(index, value);
    } else {
      invariant(this._uninitialized);
      this._uninitialized[index] = value;
    }
  }

  private _getModel(index: number): T | undefined {
    return this._getArray()[index] as T | undefined;
  }

  private _setModel(index: number, value: T) {
    invariant(this._object?.[base] instanceof AutomergeObject);

    const fullPath = [...this._object._path, ...this._path!];

    // TODO(mykola): Do not allow direct access to doc in array.
    const changeFn: ChangeFn<any> = (doc) => {
      let parent = doc;
      for (const key of fullPath.slice(0, -1)) {
        parent = parent[key];
      }
      const array: any[] = parent[fullPath.at(-1)!];
      invariant(Array.isArray(array));
      array[index] = this._object!._encode(value);
    };
    this._object._change(changeFn);
  }

  private _getArray(): T[] {
    invariant(this._object?.[base] instanceof AutomergeObject);
    const array = this._object._get(this._path!);
    invariant(Array.isArray(array));
    return array;
  }
}
