//
// Copyright 2026 DXOS.org
//

import type * as Ast from '../Ast.ts';

/** Collision-free key: the type tag keeps `1` and `"1"` apart. */
export const valueKey = (value: Ast.Value): string => (typeof value === 'number' ? `n${value}` : `s${value}`);

export const tupleKey = (tuple: Ast.Tuple): string => tuple.map(valueKey).join('\u0001');

/** Total order over values: numbers before strings, numbers numerically, strings by code unit. */
export const compareValues = (left: Ast.Value, right: Ast.Value): number => {
  if (typeof left === 'number' && typeof right === 'number') {
    return left - right;
  }
  if (typeof left === 'number') {
    return -1;
  }
  if (typeof right === 'number') {
    return 1;
  }
  return left < right ? -1 : left > right ? 1 : 0;
};

/** A set of tuples with lazily built hash indexes over bound column sets. */
export class Relation {
  readonly #tuples = new Map<string, Ast.Tuple>();
  readonly #indexes = new Map<string, Index>();

  get size(): number {
    return this.#tuples.size;
  }

  values(): IterableIterator<Ast.Tuple> {
    return this.#tuples.values();
  }

  entries(): IterableIterator<[string, Ast.Tuple]> {
    return this.#tuples.entries();
  }

  has(key: string): boolean {
    return this.#tuples.has(key);
  }

  /** Adds a tuple; returns false if it was already present. */
  add(tuple: Ast.Tuple, key = tupleKey(tuple)): boolean {
    if (this.#tuples.has(key)) {
      return false;
    }
    this.#tuples.set(key, tuple);
    for (const index of this.#indexes.values()) {
      insert(index, tuple);
    }
    return true;
  }

  delete(key: string): boolean {
    const deleted = this.#tuples.delete(key);
    if (deleted) {
      this.#indexes.clear();
    }
    return deleted;
  }

  /** Tuples whose `columns` equal `values`; scans everything when no column is bound. */
  lookup(columns: ReadonlyArray<number>, values: ReadonlyArray<Ast.Value>): Iterable<Ast.Tuple> {
    if (columns.length === 0) {
      return this.#tuples.values();
    }
    const columnsKey = columns.join(',');
    let index = this.#indexes.get(columnsKey);
    if (!index) {
      index = { columns, buckets: new Map() };
      for (const tuple of this.#tuples.values()) {
        insert(index, tuple);
      }
      this.#indexes.set(columnsKey, index);
    }
    return index.buckets.get(values.map(valueKey).join('\u0001')) ?? [];
  }
}

type Index = { readonly columns: ReadonlyArray<number>; readonly buckets: Map<string, Ast.Tuple[]> };

const insert = (index: Index, tuple: Ast.Tuple) => {
  const key = index.columns.map((column) => valueKey(tuple[column])).join('\u0001');
  const bucket = index.buckets.get(key);
  if (bucket) {
    bucket.push(tuple);
  } else {
    index.buckets.set(key, [tuple]);
  }
};
