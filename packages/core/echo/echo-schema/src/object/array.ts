//
// Copyright 2022 DXOS.org
//

import { inspect, type CustomInspectFunction } from 'node:util';

import { todo } from '@dxos/debug';

import { type AutomergeOptions, type TypedObject } from './typed-object';
import { base } from './types';
import { AutomergeArray } from '../automerge';

/**
 * Array of complex or scalar values.
 */
// TODO(burdon): Rename OrderedList.
export class EchoArray<T> implements Array<T> {
  static get [Symbol.species]() {
    return Array;
  }

  [base]: EchoArray<T> = this;

  [n: number]: T;

  [Symbol.iterator](): IterableIterator<T> {
    return this.values();
  }

  get [Symbol.unscopables](): any {
    throw new Error('Method not implemented.');
  }

  constructor(items: T[] = [], opts?: AutomergeOptions) {
    if (opts?.automerge === false) {
      throw new Error('Legacy hypercore-based ECHO objects are not supported');
    }

    return new AutomergeArray(items) as any;
  }

  get length(): number {
    return todo();
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
    return todo();
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
    return todo();
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
    return todo();
  }

  push(...items: T[]) {
    return todo();
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

  /**
   * @internal
   */
  _attach(document: TypedObject, property: string, isMeta?: boolean) {
    return todo();
  }
}
