//
// Copyright 2026 DXOS.org
//

import { Mirror } from '@dxos/echo-protocol';

type DraftInfo = { readonly recorder: Recorder<unknown>; readonly path: Mirror.Path };

const drafts = new WeakMap<object, DraftInfo>();

/** Where a draft proxy points, if the value is one. */
export const getDraftInfo = (value: unknown): DraftInfo | undefined =>
  typeof value === 'object' && value !== null ? drafts.get(value) : undefined;

/** Array methods drafts implement by recording list ops. */
const LIST_MUTATORS = new Set(['push', 'pop', 'shift', 'unshift', 'splice', 'insertAt', 'deleteAt']);

/** Array methods that would reorder in place; ECHO copies before sorting, so drafts refuse them. */
const LIST_UNSUPPORTED = new Set(['sort', 'reverse', 'fill', 'copyWithin']);

/**
 * Records the edits a change callback makes to a mirrored document as ops.
 *
 * The callback receives a draft that reads the state as it evolves and turns each write into an op,
 * in the same shapes an Automerge change callback accepts: property assignment and deletion, the
 * list methods ECHO uses, and text edits through {@link recordSplice}. Drafts address values by path,
 * like ECHO's own proxies, so a list element read before an insert above it follows the index.
 */
export class Recorder<T = unknown> {
  #current: T;
  readonly ops: Mirror.Op[] = [];

  constructor(base: T) {
    this.#current = base;
  }

  /** The state after every op recorded so far. */
  get current(): T {
    return this.#current;
  }

  record(op: Mirror.Op): void {
    this.ops.push(op);
    this.#current = Mirror.applyOps(this.#current, [op], { strict: true }).root;
  }

  /** A draft of the value at `path`; the root draft is what a change callback receives. */
  draft(path: Mirror.Path = []): object {
    const node = Mirror.getAt(this.#current, path);
    const target: object = Array.isArray(node) ? [] : {};
    const proxy = new Proxy(target, this.#handler(path));
    drafts.set(proxy, { recorder: this, path });
    return proxy;
  }

  /** Normalizes list positions in `path` to numbers, since ECHO paths carry them as strings. */
  normalize(path: readonly (string | number)[]): Mirror.Path {
    const normalized: (string | number)[] = [];
    let node: unknown = this.#current;
    for (const key of path) {
      const segment = Array.isArray(node) ? Number(key) : String(key);
      normalized.push(segment);
      node = Mirror.getAt(node, [segment]);
    }
    return normalized;
  }

  #wrap(path: Mirror.Path, value: unknown): unknown {
    return Mirror.isContainer(value) ? this.draft(path) : value;
  }

  #handler(path: Mirror.Path): ProxyHandler<object> {
    const node = () => Mirror.getAt(this.#current, path);
    return {
      get: (target, key) => {
        const current = node();
        if (Array.isArray(current)) {
          return this.#getListMember(path, current, key, target);
        }
        if (typeof key === 'symbol' || !Mirror.isContainer(current) || Array.isArray(current)) {
          return undefined;
        }
        return this.#wrap([...path, key], current[key]);
      },
      set: (target, key, value) => {
        if (typeof key === 'symbol') {
          return false;
        }
        const current = node();
        if (Array.isArray(current)) {
          this.#setListMember(path, current, key, value);
          syncLength(target, node());
          return true;
        }
        if (value === undefined) {
          throw new TypeError(`Cannot assign undefined to ${key}; ECHO encodes it as null`);
        }
        this.record({ type: 'put', path: [...path, key], value: this.plain(value) });
        return true;
      },
      deleteProperty: (_target, key) => {
        const current = node();
        if (typeof key === 'string' && Mirror.isContainer(current) && !Array.isArray(current) && key in current) {
          this.record({ type: 'del', path: [...path, key] });
        }
        return true;
      },
      has: (_target, key) => {
        const current = node();
        return typeof key === 'string' && Mirror.isContainer(current) && key in current;
      },
      ownKeys: (target) => {
        const current = node();
        if (Array.isArray(current)) {
          syncLength(target, current);
          return [...current.keys()].map(String).concat('length');
        }
        return Mirror.isContainer(current) ? Object.keys(current) : [];
      },
      getOwnPropertyDescriptor: (target, key) => {
        const current = node();
        if (Array.isArray(current) && key === 'length') {
          syncLength(target, current);
          return Reflect.getOwnPropertyDescriptor(target, key);
        }
        if (typeof key !== 'string' || !Mirror.isContainer(current) || !(key in current)) {
          return undefined;
        }
        const value = Array.isArray(current) ? current[Number(key)] : current[key];
        return { value: this.#wrap([...path, key], value), writable: true, enumerable: true, configurable: true };
      },
    };
  }

  #getListMember(path: Mirror.Path, list: readonly unknown[], key: string | symbol, target: object): unknown {
    if (key === 'length') {
      return list.length;
    }
    if (key === Symbol.iterator) {
      const recorder = this;
      return function* () {
        const current = Mirror.getAt(recorder.#current, path);
        const length = Array.isArray(current) ? current.length : 0;
        for (let index = 0; index < length; index++) {
          yield recorder.#wrap([...path, index], Array.isArray(current) ? current[index] : undefined);
        }
      };
    }
    if (typeof key === 'symbol') {
      return Reflect.get(target, key);
    }
    if (/^\d+$/.test(key)) {
      const index = Number(key);
      return this.#wrap([...path, index], list[index]);
    }
    if (LIST_MUTATORS.has(key)) {
      return (...args: unknown[]) => this.#mutateList(path, key, args);
    }
    if (LIST_UNSUPPORTED.has(key)) {
      return () => {
        throw new TypeError(`Array.${key} is not supported on a mirror draft; copy the array first`);
      };
    }
    // Everything else (map, filter, slice, indexOf, ...) reads a snapshot of the elements.
    const snapshot = list.map((value, index) => this.#wrap([...path, index], value));
    const member = Reflect.get(snapshot, key);
    return typeof member === 'function' ? member.bind(snapshot) : member;
  }

  #setListMember(path: Mirror.Path, list: readonly unknown[], key: string, value: unknown): void {
    if (key === 'length') {
      const length = Number(value);
      if (length < list.length) {
        this.record({ type: 'remove', path: [...path, length], count: list.length - length });
      } else if (length > list.length) {
        throw new TypeError('Extending a list by setting its length is not supported');
      }
      return;
    }
    const index = Number(key);
    if (!Number.isInteger(index) || index < 0 || index > list.length) {
      throw new TypeError(`Cannot set index ${key} of a list of length ${list.length}`);
    }
    if (index === list.length) {
      this.record({ type: 'insert', path: [...path, index], values: [this.plain(value)] });
    } else {
      this.record({ type: 'put', path: [...path, index], value: this.plain(value) });
    }
  }

  #mutateList(path: Mirror.Path, method: string, args: unknown[]): unknown {
    const list = Mirror.getAt(this.#current, path);
    if (!Array.isArray(list)) {
      throw new TypeError('List draft no longer points at a list');
    }
    const length = list.length;
    const insert = (index: number, values: unknown[]) => {
      if (values.length > 0) {
        this.record({ type: 'insert', path: [...path, index], values: values.map((value) => this.plain(value)) });
      }
    };
    const remove = (index: number, count: number) => {
      const removed = list.slice(index, index + count);
      if (count > 0) {
        this.record({ type: 'remove', path: [...path, index], count });
      }
      return removed;
    };
    switch (method) {
      case 'push':
        insert(length, args);
        return length + args.length;
      case 'unshift':
        insert(0, args);
        return length + args.length;
      case 'pop':
        return length > 0 ? remove(length - 1, 1)[0] : undefined;
      case 'shift':
        return length > 0 ? remove(0, 1)[0] : undefined;
      case 'insertAt': {
        const [index, ...values] = args;
        insert(Number(index), values);
        return undefined;
      }
      case 'deleteAt': {
        const [index, count] = args;
        remove(Number(index), count === undefined ? 1 : Number(count));
        return undefined;
      }
      case 'splice': {
        const [startArg, countArg, ...values] = args;
        const start = clampIndex(Number(startArg ?? 0), length);
        const count = args.length < 2 ? length - start : Math.max(0, Math.min(Number(countArg ?? 0), length - start));
        const removed = remove(start, count);
        insert(start, values);
        return removed;
      }
    }
    throw new TypeError(`Unsupported list method ${method}`);
  }

  /**
   * The storable form of a value written through a draft: drafts become the snapshot they point at,
   * containers are copied, leaves (strings, numbers, RawString, bytes) are kept.
   */
  plain(value: unknown): unknown {
    const info = getDraftInfo(value);
    if (info) {
      return Mirror.getAt(info.recorder.current, info.path);
    }
    if (Array.isArray(value)) {
      return value.map((entry) => this.plain(entry));
    }
    if (Mirror.isContainer(value)) {
      const copy: Record<string, unknown> = {};
      for (const [key, entry] of Object.entries(value)) {
        if (entry !== undefined) {
          copy[key] = this.plain(entry);
        }
      }
      return copy;
    }
    return value;
  }
}

const clampIndex = (index: number, length: number) =>
  index < 0 ? Math.max(0, length + index) : Math.min(index, length);

/** Keeps a list draft's target length in step, as proxy invariants require for `length`. */
const syncLength = (target: object, current: unknown) => {
  if (Array.isArray(target) && Array.isArray(current) && target.length !== current.length) {
    target.length = current.length;
  }
};

/**
 * Records a text edit through a draft. `path` is relative to the draft, which is how ECHO passes the
 * root draft and a full path to `A.splice`.
 */
export const recordSplice = (
  draft: unknown,
  path: readonly (string | number)[],
  index: number,
  remove: number,
  insert: string,
): boolean => {
  const info = getDraftInfo(draft);
  if (!info) {
    return false;
  }
  const fullPath = info.recorder.normalize([...info.path, ...path]);
  info.recorder.record({ type: 'splice', path: fullPath, index, remove, insert });
  return true;
};

/** Records the smallest splice turning the text at `path` into `text`, or puts `text` if there is none. */
export const recordUpdateText = (draft: unknown, path: readonly (string | number)[], text: string): boolean => {
  const info = getDraftInfo(draft);
  if (!info) {
    return false;
  }
  const fullPath = info.recorder.normalize([...info.path, ...path]);
  const current = Mirror.getAt(info.recorder.current, fullPath);
  if (typeof current !== 'string') {
    info.recorder.record({ type: 'put', path: fullPath, value: text });
    return true;
  }
  const edit = Mirror.diffText(current, text);
  if (edit) {
    info.recorder.record({ type: 'splice', path: fullPath, ...edit });
  }
  return true;
};
