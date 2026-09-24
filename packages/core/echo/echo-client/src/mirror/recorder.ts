//
// Copyright 2026 DXOS.org
//

import { Mirror } from '@dxos/echo-protocol';
import { invariant } from '@dxos/invariant';

type Key = string | number;

type Container = Record<string, unknown> | unknown[];

type Callback = (value: unknown, index: number, array: unknown[]) => unknown;

/** Automerge's find, findIndex and some pass the value and index only. */
type Predicate = (value: unknown, index: number) => unknown;

type Reducer = (previous: unknown, current: unknown, index: number, array: unknown[]) => unknown;

/** A subtree a write removed or replaced, which drafts inside it go on reading and writing unseen. */
type Detached = { value: unknown };

/**
 * A container's place in the document or in a detached subtree.
 *
 * All drafts of a container share one slot, and writes move slots rather than drafts, so a draft keeps
 * its container the way an Automerge proxy keeps its object id: through list inserts and removals
 * above it, and out of the document once a write removes or replaces the container.
 */
class Slot {
  readonly list: boolean;
  readonly children = new Map<Key, Slot>();
  parent: Slot | undefined;
  key: Key;
  /** Set on the root of a detached subtree only. */
  detached: Detached | undefined;

  constructor(list: boolean, parent?: Slot, key: Key = '') {
    this.list = list;
    this.parent = parent;
    this.key = key;
  }
}

type DraftState = {
  readonly recorder: Recorder<unknown>;
  readonly slot: Slot;
  /** Every read through a map draft, kept until a write through the same draft, as Automerge's map proxies keep them. */
  readonly cache: Map<string, unknown>;
};

const drafts = new WeakMap<object, DraftState>();

const draftState = (value: unknown): DraftState | undefined =>
  typeof value === 'object' && value !== null ? drafts.get(value) : undefined;

type DraftInfo = {
  readonly recorder: Recorder<unknown>;
  /** Where the draft's container is now: in the document when attached, else in its detached subtree. */
  readonly path: Mirror.Path;
  readonly attached: boolean;
};

/** Where a draft proxy points now, if the value is one. */
export const getDraftInfo = (value: unknown): DraftInfo | undefined => {
  const state = draftState(value);
  if (!state) {
    return undefined;
  }
  const { detached, path } = locate(state.slot);
  return { recorder: state.recorder, path, attached: !detached };
};

// Automerge registers its markers with Symbol.for, so its values are recognized without importing it.
const IMMUTABLE_STRING = Symbol.for('_am_immutableString');
const AUTOMERGE_WRAPPERS = ['_am_counter', '_am_int', '_am_uint', '_am_f64'].map((name) => Symbol.for(name));

const INDEX = /^[0-9]+$/;
const MIN_I64 = -(2n ** 63n);
const MAX_I64 = 2n ** 63n - 1n;
const MAX_U64 = 2n ** 64n - 1n;
const MAX_POSITION = 2 ** 32 - 1;
const EXISTING_OBJECT = 'Cannot create a reference to an existing document object';

const isImmutableString = (value: unknown): boolean =>
  typeof value === 'object' && value !== null && Object.hasOwn(value, IMMUTABLE_STRING);

const isAutomergeWrapper = (value: object): boolean => AUTOMERGE_WRAPPERS.some((symbol) => symbol in value);

/** Where a slot's container is now: its path in the document, or in the detached subtree holding it. */
const locate = (slot: Slot): { detached: Detached | undefined; path: Key[] } => {
  const path: Key[] = [];
  let current = slot;
  while (current.parent) {
    path.unshift(current.key);
    current = current.parent;
  }
  return { detached: current.detached, path };
};

/** Children of a list are keyed by number and of a map by string, whichever form a path carries. */
const childKey = (parent: Slot, key: Key): Key => (parent.list ? Number(key) : String(key));

/** The value at `key` of a container, reading only its own entries. */
const valueIn = (container: Container, key: Key): unknown => {
  if (Array.isArray(container)) {
    return container[Number(key)];
  }
  const name = String(key);
  return Object.hasOwn(container, name) ? container[name] : undefined;
};

const detach = (slot: Slot, value: unknown): void => {
  slot.parent?.children.delete(slot.key);
  slot.parent = undefined;
  slot.key = '';
  slot.detached = { value };
};

const shift = (parent: Slot, from: number, delta: number): void => {
  const moved = [...parent.children.values()].filter((child) => Number(child.key) >= from);
  for (const child of moved) {
    parent.children.delete(child.key);
  }
  for (const child of moved) {
    child.key = Number(child.key) + delta;
    parent.children.set(child.key, child);
  }
};

/** Moves the slots under `parent` that an op on its container displaced; `before` is that container before the op. */
const moveSlots = (parent: Slot, op: Mirror.Op, before: Container): void => {
  const key = op.path[op.path.length - 1];
  switch (op.type) {
    case 'put':
    case 'del': {
      const child = parent.children.get(childKey(parent, key));
      if (child) {
        detach(child, valueIn(before, child.key));
      }
      break;
    }
    case 'insert':
      shift(parent, Number(key), op.values.length);
      break;
    case 'remove': {
      const start = Number(key);
      for (const child of [...parent.children.values()]) {
        const index = Number(child.key);
        if (index >= start && index < start + op.count) {
          detach(child, valueIn(before, index));
        }
      }
      shift(parent, start + op.count, -op.count);
      break;
    }
    case 'splice':
      break;
  }
};

/** Automerge reads give out a fresh Date, byte array or RawString, so the stored one is never mutated through a draft. */
const copyLeaf = (value: unknown): unknown => {
  if (value instanceof Date) {
    return new Date(value.getTime());
  }
  if (value instanceof Uint8Array) {
    return new Uint8Array(value);
  }
  if (isImmutableString(value)) {
    return Object.assign(Object.create(Object.getPrototypeOf(value)), value);
  }
  return value;
};

/** Automerge reads an integer back as a number inside the safe range and as a bigint outside it. */
const readInteger = (value: bigint): number | bigint =>
  value >= BigInt(Number.MIN_SAFE_INTEGER) && value < BigInt(Number.MAX_SAFE_INTEGER) ? Number(value) : value;

/** Automerge stores an integral number as a signed 64-bit integer, saturating at its bounds. */
const storedNumber = (value: number): number | bigint => {
  if (!Number.isInteger(value)) {
    return value;
  }
  const integer = BigInt(value);
  if (integer < MIN_I64) {
    return readInteger(MIN_I64);
  }
  if (integer > MAX_I64) {
    return readInteger(MAX_I64);
  }
  return readInteger(integer);
};

/** A position Automerge's wasm layer reads as u32: fractions truncate, NaN and negative numbers become 0. */
const position = (value: number): number =>
  Number.isNaN(value) ? 0 : Math.min(Math.max(Math.trunc(value), 0), MAX_POSITION);

/** A list index argument as Automerge's list methods parse it: digit strings count, negative numbers do not. */
const listIndex = (value: unknown): number => {
  const index = typeof value === 'string' && INDEX.test(value) ? Number.parseInt(value, 10) : value;
  if (typeof index !== 'number') {
    throw new RangeError('list index must be a number');
  }
  if (index < 0 || !Number.isFinite(index)) {
    throw new RangeError(`A list index must be positive, but you passed ${index}`);
  }
  return index;
};

/** A path as the JSON pointer Automerge prints in its errors. */
const pointer = (path: readonly Key[]): string =>
  path.map((key) => `/${String(key).replaceAll('~', '~0').replaceAll('/', '~1')}`).join('');

/** Automerge lists map keys in UTF-8 byte order, which is code point order rather than UTF-16 order. */
const compareKeys = (left: string, right: string): number => {
  let leftIndex = 0;
  let rightIndex = 0;
  while (leftIndex < left.length && rightIndex < right.length) {
    const leftPoint = left.codePointAt(leftIndex) ?? 0;
    const rightPoint = right.codePointAt(rightIndex) ?? 0;
    if (leftPoint !== rightPoint) {
      return leftPoint - rightPoint;
    }
    leftIndex += leftPoint > 0xffff ? 2 : 1;
    rightIndex += rightPoint > 0xffff ? 2 : 1;
  }
  return left.length - leftIndex - (right.length - rightIndex);
};

/**
 * Records the edits a change callback makes to a mirrored document as ops.
 *
 * The callback receives a draft that behaves as the draft of `A.change` does: writes Automerge refuses
 * throw synchronously, reads return what Automerge's proxies return, and drafts keep their container
 * by identity, so a draft held across a list insert, removal or replacement edits what an Automerge
 * proxy would. Text edits go through {@link recordSplice} and {@link recordUpdateText}.
 */
export class Recorder<T = unknown> {
  readonly ops: Mirror.Op[] = [];
  readonly #root: Slot;
  #current: T;

  constructor(base: T) {
    this.#current = base;
    this.#root = new Slot(Array.isArray(base));
  }

  /** The state after every op recorded so far. */
  get current(): T {
    return this.#current;
  }

  /** Records an op addressed from the document root, moving the drafts it displaces. */
  record(op: Mirror.Op): void {
    this.#write(this.#root, op);
  }

  /** A draft of the container at `path`; the root draft is what a change callback receives. */
  draft(path: Mirror.Path = []): object {
    let slot = this.#root;
    for (const key of path) {
      const value = valueIn(this.#container(slot), key);
      invariant(Mirror.isContainer(value), `No container at ${pointer(path)}`);
      slot = this.#child(slot, key, value);
    }
    return this.#draft(slot);
  }

  /**
   * `A.splice` through one of this recorder's drafts, with Automerge's reading of its arguments.
   * @returns false when `draft` is not one of this recorder's drafts.
   */
  splice(draft: unknown, path: readonly Key[], index: number, remove: number, insert: string): boolean {
    const state = draftState(draft);
    if (state?.recorder !== this) {
      return false;
    }
    state.cache.clear();
    const { text, path: textPath } = this.#textAt(state.slot, path, 'splice');
    const from = position(index);
    const delta = Number.isNaN(remove) ? 0 : Math.trunc(remove);
    // A negative count removes characters before the index, as Automerge's splice does.
    const start = Math.min(from, from + delta);
    if (from > text.length || start < 0) {
      throw new RangeError(`Cannot splice: index ${from} is out of bounds`);
    }
    const end = delta < 0 ? from : Math.min(from + delta, text.length);
    if (end > start || insert.length > 0) {
      this.#write(state.slot, { type: 'splice', path: textPath, index: start, remove: end - start, insert });
    }
    return true;
  }

  /**
   * `A.updateText` through one of this recorder's drafts: the smallest splice turning the text into `text`.
   * @returns false when `draft` is not one of this recorder's drafts.
   */
  updateText(draft: unknown, path: readonly Key[], text: string): boolean {
    const state = draftState(draft);
    if (state?.recorder !== this) {
      return false;
    }
    state.cache.clear();
    const { text: current, path: textPath } = this.#textAt(state.slot, path, 'updateText');
    const edit = Mirror.diffText(current, text);
    if (edit) {
      this.#write(state.slot, { type: 'splice', path: textPath, ...edit });
    }
    return true;
  }

  /** The container a slot holds now. */
  #container(slot: Slot): Container {
    const { detached, path } = locate(slot);
    const value = Mirror.getAt(detached ? detached.value : this.#current, path);
    invariant(Mirror.isContainer(value), 'A draft lost its container');
    return value;
  }

  #list(slot: Slot): unknown[] {
    const container = this.#container(slot);
    invariant(Array.isArray(container), 'A list draft points at a map');
    return container;
  }

  #map(slot: Slot): Record<string, unknown> {
    const container = this.#container(slot);
    invariant(!Array.isArray(container), 'A map draft points at a list');
    return container;
  }

  #child(parent: Slot, key: Key, value: Container): Slot {
    const normalized = childKey(parent, key);
    let child = parent.children.get(normalized);
    if (!child) {
      child = new Slot(Array.isArray(value), parent, normalized);
      parent.children.set(normalized, child);
    }
    return child;
  }

  /** The existing slot `keys` lead to from `slot`; none means no draft is below it. */
  #descend(slot: Slot, keys: readonly Key[]): Slot | undefined {
    let current = slot;
    for (const key of keys) {
      const child = current.children.get(childKey(current, key));
      if (!child) {
        return undefined;
      }
      current = child;
    }
    return current;
  }

  #draft(slot: Slot): object {
    const state: DraftState = { recorder: this, slot, cache: new Map() };
    const proxy = slot.list
      ? new Proxy<unknown[]>([], this.#listHandler(state))
      : new Proxy({}, this.#mapHandler(state));
    drafts.set(proxy, state);
    return proxy;
  }

  #isOwnDraft(value: unknown): boolean {
    return draftState(value)?.recorder === this;
  }

  /** What a read through a draft returns: a draft for a container, a copy of a mutable leaf, else the value. */
  #read(parent: Slot, key: Key, value: unknown): unknown {
    return Mirror.isContainer(value) ? this.#draft(this.#child(parent, key, value)) : copyLeaf(value);
  }

  /** A list element as Automerge reads it: uncached, so every read of a container is a new draft. */
  #element(slot: Slot, index: number): unknown {
    const list = this.#list(slot);
    return index < list.length ? this.#read(slot, index, list[index]) : undefined;
  }

  /**
   * Applies an op addressed from `slot`'s container: recorded when the container is in the document,
   * applied to its detached subtree otherwise, as Automerge writes to an object no longer reachable.
   */
  #write(slot: Slot, op: Mirror.Op): void {
    const { detached, path } = locate(slot);
    const absolute: Mirror.Op = { ...op, path: [...path, ...op.path] };
    const parentKeys = op.path.slice(0, -1);
    const parent = op.type === 'splice' ? undefined : this.#descend(slot, parentKeys);
    const before = parent && Mirror.getAt(detached ? detached.value : this.#current, [...path, ...parentKeys]);
    if (detached) {
      detached.value = Mirror.applyOps(detached.value, [absolute], { strict: true }).root;
    } else {
      this.#current = Mirror.applyOps(this.#current, [absolute], { strict: true }).root;
      this.ops.push(absolute);
    }
    if (parent && Mirror.isContainer(before)) {
      moveSlots(parent, op, before);
    }
  }

  /**
   * The mirror form of a value written through a draft, by Automerge's rules: `undefined` anywhere,
   * holes, functions, symbols and values already in this document are refused, class instances become
   * maps of their own fields, and numbers are stored as Automerge reads them back. Objects Automerge
   * would store as lossy maps (a nested Map or function, its number wrappers) are refused too.
   */
  #storable(value: unknown, path: readonly Key[]): unknown {
    if (value === undefined) {
      throw new RangeError(
        `Cannot assign undefined value at ${pointer(path)}; set it to null or delete the key instead`,
      );
    }
    if (value === null || typeof value === 'string' || typeof value === 'boolean') {
      return value;
    }
    if (typeof value === 'number') {
      return storedNumber(value);
    }
    if (typeof value === 'bigint') {
      if (value < MIN_I64 || value > MAX_U64) {
        throw new RangeError(`Cannot assign ${value} at ${pointer(path)}; Automerge integers have 64 bits`);
      }
      return readInteger(value);
    }
    if (typeof value !== 'object') {
      throw new RangeError(`Cannot assign ${typeof value} value at ${pointer(path)}`);
    }
    const draft = draftState(value);
    if (draft) {
      if (draft.recorder === this) {
        throw new RangeError(`${EXISTING_OBJECT} at ${pointer(path)}`);
      }
      return this.#storable(draft.recorder.#container(draft.slot), path);
    }
    if (value instanceof Date) {
      const time = value.getTime();
      return new Date(Number.isNaN(time) ? 0 : time);
    }
    if (value instanceof Uint8Array) {
      return new Uint8Array(value);
    }
    if (isImmutableString(value)) {
      return value;
    }
    if (isAutomergeWrapper(value)) {
      throw new TypeError(`Cannot assign an Automerge counter or number wrapper at ${pointer(path)} through a mirror`);
    }
    if (Array.isArray(value)) {
      const entries: unknown[] = [];
      for (let index = 0; index < value.length; index++) {
        entries.push(this.#storable(value[index], [...path, index]));
      }
      return Object.freeze(entries);
    }
    if (Object.prototype.toString.call(value) === '[object Object]') {
      if (!(value instanceof Object)) {
        throw new RangeError(`Cannot assign an object without a prototype at ${pointer(path)}`);
      }
      const copy: Record<string, unknown> = {};
      for (const key of Object.keys(value)) {
        if (key === '__proto__') {
          throw new RangeError('The key "__proto__" is not allowed in Automerge documents');
        }
        copy[key] = this.#storable(Reflect.get(value, key), [...path, key]);
      }
      return Object.freeze(copy);
    }
    throw new RangeError(`Cannot assign unknown object ${Object.prototype.toString.call(value)} at ${pointer(path)}`);
  }

  /** The text `path` leads to from a draft's container, failing where Automerge's path lookup fails. */
  #textAt(slot: Slot, path: readonly Key[], operation: string): { text: string; path: Key[] } {
    const fail = (reason: string) => new RangeError(`Cannot ${operation}: ${reason}`);
    const segments: Key[] = [];
    let node: unknown = this.#container(slot);
    for (const [depth, key] of path.entries()) {
      if (!Mirror.isContainer(node)) {
        throw fail(`path component ${depth} (${key}) did not refer to an object`);
      }
      const isIndex = typeof key === 'number' || INDEX.test(key);
      const segment = Array.isArray(node) ? (isIndex ? Number(key) : Number.NaN) : String(key);
      const child = valueIn(node, segment);
      if (child === undefined) {
        throw fail(`path component ${depth} (${key}) referenced a nonexistent object`);
      }
      segments.push(segment);
      node = child;
    }
    if (typeof node !== 'string') {
      throw fail(Mirror.isContainer(node) ? 'object was not a text object' : 'path did not refer to an object');
    }
    return { text: node, path: segments };
  }

  #mapHandler({ slot, cache }: DraftState): ProxyHandler<object> {
    const read = (key: string | symbol): unknown => {
      if (typeof key === 'symbol') {
        return undefined;
      }
      if (!cache.has(key)) {
        const map = this.#map(slot);
        cache.set(key, Object.hasOwn(map, key) ? this.#read(slot, key, map[key]) : undefined);
      }
      return cache.get(key);
    };
    const mapKey = (key: string | symbol): string => {
      if (typeof key === 'symbol') {
        throw new RangeError('Map keys must be strings');
      }
      if (key === '__proto__') {
        throw new RangeError('The key "__proto__" is not allowed in Automerge documents');
      }
      return key;
    };
    return {
      get: (_target, key) => read(key),
      set: (_target, key, value) => {
        cache.clear();
        const name = mapKey(key);
        const stored = this.#storable(value, [...locate(slot).path, name]);
        this.#write(slot, { type: 'put', path: [name], value: stored });
        return true;
      },
      deleteProperty: (_target, key) => {
        cache.clear();
        const name = mapKey(key);
        if (Object.hasOwn(this.#map(slot), name)) {
          this.#write(slot, { type: 'del', path: [name] });
        }
        return true;
      },
      has: (_target, key) => read(key) !== undefined,
      ownKeys: () => Object.keys(this.#map(slot)).sort(compareKeys),
      getOwnPropertyDescriptor: (_target, key) => {
        const value = read(key);
        return value === undefined ? undefined : { value, writable: false, enumerable: true, configurable: true };
      },
    };
  }

  #listHandler({ slot }: DraftState): ProxyHandler<unknown[]> {
    return {
      get: (_target, key, receiver) => {
        if (key === 'length') {
          return this.#list(slot).length;
        }
        if (typeof key === 'string' && INDEX.test(key)) {
          return this.#element(slot, Number(key));
        }
        // Members come from a plain object, so Array.prototype methods Automerge lacks (sort, reverse) are undefined.
        return Reflect.get(this.#listMethods(slot, receiver), key);
      },
      set: (_target, key, value) => {
        if (typeof key === 'symbol') {
          throw new TypeError('Cannot convert a Symbol value to a number');
        }
        if (!INDEX.test(key)) {
          throw new RangeError('list index must be a number');
        }
        const index = Number(key);
        const stored = this.#storable(value, [...locate(slot).path, index]);
        const length = this.#list(slot).length;
        if (index > length) {
          throw new RangeError(`index ${index} is out of bounds`);
        }
        this.#write(
          slot,
          index === length
            ? { type: 'insert', path: [index], values: [stored] }
            : { type: 'put', path: [index], value: stored },
        );
        return true;
      },
      deleteProperty: (_target, key) => {
        if (typeof key === 'symbol' || !INDEX.test(key)) {
          throw new RangeError('invalid op for object of type `list`');
        }
        const index = Number(key);
        if (index >= this.#list(slot).length) {
          throw new RangeError(`index ${index} is out of bounds`);
        }
        this.#write(slot, { type: 'remove', path: [index], count: 1 });
        return true;
      },
      has: (_target, key) =>
        key === 'length' || (typeof key === 'string' && INDEX.test(key) && Number(key) < this.#list(slot).length),
      // Automerge lists expose no index keys, so Object.keys and spread see nothing.
      ownKeys: () => ['length'],
      getOwnPropertyDescriptor: (_target, key) => {
        if (key === 'length') {
          return { value: this.#list(slot).length, writable: true, enumerable: false, configurable: false };
        }
        if (typeof key === 'string' && INDEX.test(key)) {
          return { value: this.#element(slot, Number(key)), writable: false, enumerable: true, configurable: true };
        }
        return undefined;
      },
    };
  }

  /** The list methods of Automerge's list proxy, with its argument handling and return values. */
  #listMethods(slot: Slot, self: unknown) {
    const length = () => this.#list(slot).length;
    const element = (index: number) => this.#element(slot, index);
    function* iterate(): Generator<unknown> {
      let index = 0;
      let value = element(index);
      while (value !== undefined) {
        yield value;
        index++;
        value = element(index);
      }
    }
    const toArray = (): unknown[] => [...iterate()];
    const find = (predicate: Predicate): unknown => {
      let index = 0;
      for (const value of iterate()) {
        if (predicate(value, index)) {
          return value;
        }
        index++;
      }
      return undefined;
    };
    const findIndex = (predicate: Predicate): number => {
      let index = 0;
      for (const value of iterate()) {
        if (predicate(value, index)) {
          return index;
        }
        index++;
      }
      return -1;
    };

    const splice = (start: unknown, deleteCount: unknown, inserted: unknown[]): unknown[] => {
      const index = listIndex(start);
      const count = listIndex(typeof deleteCount === 'number' ? deleteCount : length() - index);
      if (inserted.some((value) => this.#isOwnDraft(value))) {
        throw new RangeError(EXISTING_OBJECT);
      }
      const removed: unknown[] = [];
      for (let offset = 0; offset < count && position(index + offset) < length(); offset++) {
        removed.push(element(position(index + offset)));
      }
      const path = locate(slot).path;
      const stored = inserted.map((value, offset) => this.#storable(value, [...path, index + offset]));
      const from = position(index);
      const available = Math.max(length() - from, 0);
      if (stored.length > 0 && from > length()) {
        throw new RangeError(`index ${from} is out of bounds`);
      }
      const removeCount = Math.min(position(count), available);
      if (removeCount > 0) {
        this.#write(slot, { type: 'remove', path: [from], count: removeCount });
      }
      if (stored.length > 0) {
        this.#write(slot, { type: 'insert', path: [from], values: stored });
      }
      return removed;
    };

    // `deleteAt(index)` reaches Automerge's delete, which ignores a string position.
    const removeOne = (index: unknown): void => {
      if (typeof index === 'string') {
        return;
      }
      if (typeof index !== 'number') {
        throw new RangeError('given property was not a string or integer');
      }
      const at = position(index);
      if (at >= length()) {
        throw new RangeError(`index ${at} is out of bounds`);
      }
      this.#write(slot, { type: 'remove', path: [at], count: 1 });
    };

    // `deleteAt(index, count)` reaches Automerge's splice, where a negative count removes elements before the index.
    const removeRange = (index: unknown, count: number): void => {
      if (typeof index !== 'number' && !(typeof index === 'string' && INDEX.test(index))) {
        throw new RangeError('given property was not a string or integer');
      }
      const from = position(Number(index));
      const delta = Number.isNaN(count) ? 0 : Math.trunc(count);
      if (from + delta < 0) {
        throw new RangeError(`index ${from} is out of bounds`);
      }
      const start = Math.min(from, from + delta);
      const end = Math.min(delta < 0 ? from : from + delta, length());
      if (end > start) {
        this.#write(slot, { type: 'remove', path: [start], count: end - start });
      }
    };

    return {
      at: (index?: unknown) => {
        if (index === undefined) {
          return undefined;
        }
        if (typeof index !== 'number') {
          throw new RangeError('invalid op for object of type `list`');
        }
        return element(position(index));
      },
      deleteAt: (index: unknown, count?: unknown) => {
        if (typeof count === 'number') {
          removeRange(index, count);
        } else {
          removeOne(index);
        }
        return self;
      },
      fill: (value: unknown, start?: unknown, end?: unknown) => {
        const stored = this.#storable(value, [...locate(slot).path, String(start)]);
        const count = length();
        // Automerge treats 0 and a missing bound alike, so fill(value, 0, 0) fills the whole list.
        const from = listIndex(start || 0);
        const to = listIndex(end || count);
        for (let index = from; index < Math.min(to, count); index++) {
          this.#write(slot, { type: 'put', path: [position(index)], value: stored });
        }
        return self;
      },
      indexOf: (search: unknown, start: number = 0) => {
        const list = this.#list(slot);
        for (let index = start; index < list.length; index++) {
          const at = position(index);
          const value = list[at];
          // Text, maps and lists are objects to Automerge: text matches its content, containers their own drafts.
          if (typeof value === 'string' || Mirror.isContainer(value)) {
            if (value === search) {
              return index;
            }
            if (search === null || search === undefined) {
              throw new TypeError(`Cannot read properties of ${search}`);
            }
            const state = draftState(search);
            if (state?.recorder === this && state.slot.parent === slot && state.slot.key === at) {
              return index;
            }
          } else if (!(value instanceof Date) && !(value instanceof Uint8Array)) {
            if ((isImmutableString(value) ? String(value) : value) === search) {
              return index;
            }
          }
        }
        return -1;
      },
      insertAt: (index: unknown, ...values: unknown[]) => {
        splice(index, 0, values);
        return self;
      },
      pop: () => {
        const last = length() - 1;
        if (last < 0) {
          return undefined;
        }
        const value = element(last);
        this.#write(slot, { type: 'remove', path: [last], count: 1 });
        return value;
      },
      push: (...values: unknown[]) => {
        splice(length(), 0, values);
        return length();
      },
      shift: () => {
        if (length() === 0) {
          return undefined;
        }
        const value = element(0);
        this.#write(slot, { type: 'remove', path: [0], count: 1 });
        return value;
      },
      splice: (start: unknown, deleteCount?: unknown, ...values: unknown[]) => splice(start, deleteCount, values),
      unshift: (...values: unknown[]) => {
        splice(0, 0, values);
        return length();
      },
      *entries() {
        let index = 0;
        for (const value of iterate()) {
          yield [index, value];
          index++;
        }
      },
      *keys() {
        const count = length();
        for (let index = 0; index < count; index++) {
          yield index;
        }
      },
      values: iterate,
      toArray,
      map: (callback: Callback) => toArray().map(callback),
      toString: () => toArray().toString(),
      toLocaleString: () => toArray().toLocaleString(),
      forEach: (callback: Callback) => toArray().forEach(callback),
      concat: (other: unknown) => toArray().concat(other),
      every: (predicate: Callback) => toArray().every(predicate),
      filter: (predicate: Callback) => toArray().filter(predicate),
      find,
      findIndex,
      // Each read of a container or a mutable leaf is a new value, so includes finds only primitives and text.
      includes: (search: unknown) => find((value) => value === search) !== undefined,
      join: (separator?: string) => toArray().join(separator),
      reduce: (reducer: Reducer, initial?: unknown) => toArray().reduce(reducer, initial),
      reduceRight: (reducer: Reducer, initial?: unknown) => toArray().reduceRight(reducer, initial),
      lastIndexOf: (search: unknown, from: number = Infinity) => toArray().lastIndexOf(search, from),
      slice: (start?: number, end?: number) => toArray().slice(start, end),
      some: (predicate: Predicate) => findIndex(predicate) !== -1,
      [Symbol.iterator]: iterate,
    };
  }
}

/**
 * Records a text edit through a draft. `path` is relative to the draft, which is how ECHO passes the
 * root draft and a full path to `A.splice`.
 * @returns false when `draft` is not a mirror draft, so the caller can use `A.splice`.
 */
export const recordSplice = (
  draft: unknown,
  path: readonly (string | number)[],
  index: number,
  remove: number,
  insert: string,
): boolean => draftState(draft)?.recorder.splice(draft, path, index, remove, insert) ?? false;

/**
 * Records the smallest splice turning the text at `path` into `text`. Like `A.updateText`, it throws
 * when `path` does not lead to text, including a RawString.
 * @returns false when `draft` is not a mirror draft, so the caller can use `A.updateText`.
 */
export const recordUpdateText = (draft: unknown, path: readonly (string | number)[], text: string): boolean =>
  draftState(draft)?.recorder.updateText(draft, path, text) ?? false;
