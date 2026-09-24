//
// Copyright 2026 DXOS.org
//

/**
 * Path to a value inside a mirrored document: map keys are strings, list positions are numbers.
 */
export type Path = readonly (string | number)[];

/**
 * An edit to a mirrored document, expressed against the exact state it applies to.
 *
 * Tabs record these instead of Automerge changes; the worker applies them to the Automerge document
 * and converts the patches of changes it merges from elsewhere back into them.
 */
export type Op = PutOp | DelOp | InsertOp | RemoveOp | SpliceOp;

/** Sets a map key or replaces a list element. A string value becomes a new text object. */
export type PutOp = { readonly type: 'put'; readonly path: Path; readonly value: unknown };

/** Deletes a map key. */
export type DelOp = { readonly type: 'del'; readonly path: Path };

/** Inserts values into the list at `path[:-1]`, before the element at index `path[-1]`. */
export type InsertOp = { readonly type: 'insert'; readonly path: Path; readonly values: readonly unknown[] };

/** Removes `count` elements from the list at `path[:-1]`, starting at index `path[-1]`. */
export type RemoveOp = { readonly type: 'remove'; readonly path: Path; readonly count: number };

/** Edits the text at `path` in place, so concurrent edits to the same text merge. */
export type SpliceOp = {
  readonly type: 'splice';
  readonly path: Path;
  readonly index: number;
  readonly remove: number;
  readonly insert: string;
};

/**
 * Change notification in Automerge's patch format, so consumers written against Automerge patches
 * (document-change routing, store adapters) read mirror changes unchanged.
 */
export type MirrorPatch =
  | { action: 'put'; path: (string | number)[]; value: unknown }
  | { action: 'del'; path: (string | number)[]; length?: number }
  | { action: 'insert'; path: (string | number)[]; values: unknown[] }
  | { action: 'splice'; path: (string | number)[]; value: string };

type Container = Record<string, unknown> | unknown[];

/** Plain objects and arrays are containers; everything else (strings, RawString, bytes, dates) is a leaf. */
export const isContainer = (value: unknown): value is Container => {
  if (Array.isArray(value)) {
    return true;
  }
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
};

/**
 * Deep-copies containers and freezes them, keeping leaves by reference. Already-frozen containers
 * are shared, so a snapshot can be stored inside another without copying.
 */
export const freezeValue = <T>(value: T): T => {
  if (!isContainer(value) || Object.isFrozen(value)) {
    return value;
  }
  if (Array.isArray(value)) {
    return Object.freeze(value.map((entry) => freezeValue(entry))) as T;
  }
  const copy: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (entry !== undefined) {
      copy[key] = freezeValue(entry);
    }
  }
  return Object.freeze(copy) as T;
};

/** Reads the value at `path`, or undefined when any segment is missing. */
export const getAt = (root: unknown, path: Path): unknown => {
  let node = root;
  for (const key of path) {
    if (!isContainer(node)) {
      return undefined;
    }
    node = Array.isArray(node) ? node[Number(key)] : node[String(key)];
  }
  return node;
};

/** Thrown in strict mode when an op does not fit the state it is applied to. */
export class InvalidOpError extends Error {
  constructor(
    readonly op: Op,
    reason: string,
  ) {
    super(`Invalid ${op.type} at ${JSON.stringify(op.path)}: ${reason}`);
  }
}

export type ApplyOptions = {
  /** Throw on an op that does not fit instead of skipping it; tests use this to catch transform bugs. */
  strict?: boolean;
};

export type ApplyResult<T> = { root: T; patches: MirrorPatch[] };

/**
 * Applies ops to a frozen snapshot and returns the new snapshot. Only containers on each op's path
 * are copied, so untouched subtrees keep their identity.
 */
export const applyOps = <T>(root: T, ops: readonly Op[], options: ApplyOptions = {}): ApplyResult<T> => {
  let current: unknown = root;
  const patches: MirrorPatch[] = [];
  for (const op of ops) {
    const next = applyOp(current, op, options);
    if (next !== undefined) {
      current = next.root;
      patches.push(...next.patches);
    }
  }
  return { root: current as T, patches };
};

const applyOp = (root: unknown, op: Op, { strict }: ApplyOptions): ApplyResult<unknown> | undefined => {
  const fail = (reason: string) => {
    if (strict) {
      throw new InvalidOpError(op, reason);
    }
    return undefined;
  };

  switch (op.type) {
    case 'splice': {
      const text = getAt(root, op.path);
      if (typeof text !== 'string') {
        return fail('target is not text');
      }
      if (op.index < 0 || op.remove < 0 || op.index + op.remove > text.length) {
        return fail(`range ${op.index}+${op.remove} outside length ${text.length}`);
      }
      const updated = text.slice(0, op.index) + op.insert + text.slice(op.index + op.remove);
      const patches: MirrorPatch[] = [];
      if (op.remove > 0) {
        patches.push({ action: 'del', path: [...op.path, op.index], length: op.remove });
      }
      if (op.insert.length > 0) {
        patches.push({ action: 'splice', path: [...op.path, op.index], value: op.insert });
      }
      return { root: setIn(root, op.path, 0, () => updated), patches };
    }

    case 'put':
    case 'del':
    case 'insert':
    case 'remove': {
      if (op.path.length === 0) {
        return fail('empty path');
      }
      const parentPath = op.path.slice(0, -1);
      const key = op.path[op.path.length - 1];
      const parent = getAt(root, parentPath);
      if (!isContainer(parent)) {
        return fail('parent is not a container');
      }

      if (Array.isArray(parent)) {
        const index = Number(key);
        if (!Number.isInteger(index) || index < 0) {
          return fail('list index is not a non-negative integer');
        }
        const listPath = [...parentPath, index];
        switch (op.type) {
          case 'put': {
            if (index >= parent.length) {
              return fail(`index ${index} outside length ${parent.length}`);
            }
            const value = freezeValue(op.value);
            return {
              root: setIn(root, parentPath, 0, () => replaceAt(parent, index, 0, [value], 1)),
              patches: [{ action: 'put', path: listPath, value }],
            };
          }
          case 'insert': {
            if (index > parent.length) {
              return fail(`insert index ${index} outside length ${parent.length}`);
            }
            const values = op.values.map((value) => freezeValue(value));
            return {
              root: setIn(root, parentPath, 0, () => replaceAt(parent, index, 0, values, 0)),
              patches: [{ action: 'insert', path: listPath, values }],
            };
          }
          case 'remove': {
            if (op.count <= 0 || index + op.count > parent.length) {
              return fail(`remove ${index}+${op.count} outside length ${parent.length}`);
            }
            return {
              root: setIn(root, parentPath, 0, () => replaceAt(parent, index, op.count, [], 0)),
              patches: [{ action: 'del', path: listPath, length: op.count }],
            };
          }
          case 'del':
            return fail('del on a list element; use remove');
        }
      }

      const mapKey = String(key);
      switch (op.type) {
        case 'put': {
          const value = freezeValue(op.value);
          return {
            root: setIn(root, parentPath, 0, () => Object.freeze({ ...parent, [mapKey]: value })),
            patches: [{ action: 'put', path: [...parentPath, mapKey], value }],
          };
        }
        case 'del': {
          if (!(mapKey in parent)) {
            return fail('key does not exist');
          }
          const { [mapKey]: _removed, ...rest } = parent;
          return {
            root: setIn(root, parentPath, 0, () => Object.freeze(rest)),
            patches: [{ action: 'del', path: [...parentPath, mapKey] }],
          };
        }
        case 'insert':
        case 'remove':
          return fail(`${op.type} on a map`);
      }
    }
  }
};

const replaceAt = (list: readonly unknown[], index: number, remove: number, insert: unknown[], replace: number) => {
  const copy = list.slice();
  copy.splice(index, remove + replace, ...insert);
  return Object.freeze(copy);
};

/** Rebuilds the containers from the root down to `path`, replacing the value there with `update(old)`. */
const setIn = (node: unknown, path: Path, depth: number, update: (value: unknown) => unknown): unknown => {
  if (depth === path.length) {
    return update(node);
  }
  if (!isContainer(node)) {
    throw new Error(`No container at ${JSON.stringify(path.slice(0, depth))}`);
  }
  const key = path[depth];
  if (Array.isArray(node)) {
    const index = Number(key);
    const child = setIn(node[index], path, depth + 1, update);
    return replaceAt(node, index, 0, [child], 1);
  }
  const child = setIn(node[String(key)], path, depth + 1, update);
  return Object.freeze({ ...node, [String(key)]: child });
};

/**
 * Smallest single splice turning `before` into `after`, or undefined when they are equal.
 * Keeps unchanged prefix and suffix intact so concurrent edits outside the change survive.
 */
export const diffText = (
  before: string,
  after: string,
): { index: number; remove: number; insert: string } | undefined => {
  if (before === after) {
    return undefined;
  }
  let prefix = 0;
  const max = Math.min(before.length, after.length);
  while (prefix < max && before.charCodeAt(prefix) === after.charCodeAt(prefix)) {
    prefix++;
  }
  let suffix = 0;
  while (
    suffix < max - prefix &&
    before.charCodeAt(before.length - 1 - suffix) === after.charCodeAt(after.length - 1 - suffix)
  ) {
    suffix++;
  }
  return {
    index: prefix,
    remove: before.length - prefix - suffix,
    insert: after.slice(prefix, after.length - suffix),
  };
};

/** Checks the shape of an op received over the wire. */
export const isOp = (value: unknown): value is Op => {
  if (typeof value !== 'object' || value === null || !('type' in value) || !('path' in value)) {
    return false;
  }
  if (!Array.isArray(value.path)) {
    return false;
  }
  switch (value.type) {
    case 'put':
      return 'value' in value;
    case 'del':
      return true;
    case 'insert':
      return 'values' in value && Array.isArray(value.values);
    case 'remove':
      return 'count' in value && typeof value.count === 'number';
    case 'splice':
      return (
        'index' in value &&
        typeof value.index === 'number' &&
        'remove' in value &&
        typeof value.remove === 'number' &&
        'insert' in value &&
        typeof value.insert === 'string'
      );
    default:
      return false;
  }
};
