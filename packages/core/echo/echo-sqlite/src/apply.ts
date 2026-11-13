//
// Copyright 2026 DXOS.org
//

import * as A from '@automerge/automerge';

type Container = Record<string | number, unknown>;

/**
 * Sets `parent[key]` (at `path`) inside an `A.change` callback to `value` with the smallest edit, so
 * concurrent edits from another writer merge: maps and arrays are updated member by member, and a
 * string replaces only the characters that changed, as text the CRDT merges. `undefined` deletes.
 */
export const applyValue = (
  doc: unknown,
  path: readonly (string | number)[],
  parent: Container,
  key: string | number,
  value: unknown,
): void => {
  const current = parent[key];
  if (value === undefined) {
    if (current !== undefined) {
      if (Array.isArray(parent) && typeof key === 'number') {
        parent.splice(key, 1);
      } else {
        delete parent[key];
      }
    }
    return;
  }

  if (typeof value === 'string' && typeof current === 'string') {
    if (current !== value) {
      // The doc proxy is typed by its caller; Automerge's path API takes it as a plain doc.
      A.updateText(doc as A.Doc<unknown>, [...path, key], value);
    }
    return;
  }

  if (isPlainObject(value) && isPlainObject(current)) {
    const target = current as Container;
    for (const existing of Object.keys(target)) {
      if (!(existing in value) || (value as Container)[existing] === undefined) {
        delete target[existing];
      }
    }
    for (const [innerKey, inner] of Object.entries(value)) {
      applyValue(doc, [...path, key], target, innerKey, inner);
    }
    return;
  }

  if (Array.isArray(value) && Array.isArray(current)) {
    const target = current as unknown[];
    const common = Math.min(target.length, value.length);
    for (let index = 0; index < common; index++) {
      applyValue(doc, [...path, key], target as unknown as Container, index, value[index]);
    }
    if (target.length > value.length) {
      target.splice(value.length, target.length - value.length);
    }
    for (let index = common; index < value.length; index++) {
      target.push(toStorable(value[index]));
    }
    return;
  }

  if (!sameScalar(current, value)) {
    parent[key] = toStorable(value);
  }
};

/** Automerge stores no `undefined`: drop such members before inserting a new subtree. */
const toStorable = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.filter((item) => item !== undefined).map(toStorable);
  }
  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, inner]) => inner !== undefined)
        .map(([innerKey, inner]) => [innerKey, toStorable(inner)]),
    );
  }
  return value;
};

const sameScalar = (left: unknown, right: unknown): boolean => {
  if (left instanceof Uint8Array && right instanceof Uint8Array) {
    return left.byteLength === right.byteLength && left.every((byte, index) => byte === right[index]);
  }
  return left === right;
};

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' &&
  value !== null &&
  !Array.isArray(value) &&
  !(value instanceof Uint8Array) &&
  !(value instanceof Date);
