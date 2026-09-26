//
// Copyright 2026 DXOS.org
//

// An index copy is a plain value with no op ids, so two copies are compared by value.

import * as Op from '../Op.ts';

/**
 * The positional patches that turn `before` into `after`: maps key by key, lists and strings by the
 * span between their common prefix and suffix, and lists of the same length element by element.
 */
export const diffValues = (before: unknown, after: unknown, path: (string | number)[] = []): Op.Patch[] => {
  if (Op.equals(before, after)) {
    return [];
  }
  if (typeof before === 'string' && typeof after === 'string') {
    const splice = Op.diffText(before, after);
    if (!splice) {
      return [];
    }
    const patches: Op.Patch[] = [];
    if (splice.remove > 0) {
      patches.push({ action: 'del', path: [...path, splice.index], length: splice.remove });
    }
    if (splice.insert.length > 0) {
      patches.push({ action: 'splice', path: [...path, splice.index], value: splice.insert });
    }
    return patches;
  }
  if (Array.isArray(before) && Array.isArray(after)) {
    return diffLists(before, after, path);
  }
  if (isMap(before) && isMap(after)) {
    const patches: Op.Patch[] = [];
    for (const key of Object.keys(before)) {
      if (!(key in after)) {
        patches.push({ action: 'del', path: [...path, key] });
      }
    }
    for (const [key, value] of Object.entries(after)) {
      patches.push(...(key in before ? diffValues(before[key], value, [...path, key]) : [put([...path, key], value)]));
    }
    return patches;
  }
  return [put(path, after)];
};

const diffLists = (before: readonly unknown[], after: readonly unknown[], path: (string | number)[]): Op.Patch[] => {
  let prefix = 0;
  while (prefix < before.length && prefix < after.length && Op.equals(before[prefix], after[prefix])) {
    prefix++;
  }
  let suffix = 0;
  while (
    suffix < before.length - prefix &&
    suffix < after.length - prefix &&
    Op.equals(before[before.length - 1 - suffix], after[after.length - 1 - suffix])
  ) {
    suffix++;
  }
  const removed = before.length - prefix - suffix;
  const inserted = after.slice(prefix, after.length - suffix);
  if (removed === inserted.length) {
    return inserted.flatMap((value, offset) => diffValues(before[prefix + offset], value, [...path, prefix + offset]));
  }
  const patches: Op.Patch[] = [];
  if (removed > 0) {
    patches.push({ action: 'del', path: [...path, prefix], length: removed });
  }
  if (inserted.length > 0) {
    patches.push({ action: 'insert', path: [...path, prefix], values: inserted });
  }
  return patches;
};

/**
 * `after`, with every subtree that equals the one at the same place in `before` replaced by it, so a new
 * copy of a document shares what did not change and keeps those objects' identity.
 */
export const reuseEqual = (before: unknown, after: unknown): unknown => {
  if (Op.equals(before, after)) {
    return before;
  }
  if (Array.isArray(before) && Array.isArray(after)) {
    return after.map((value, index) => reuseEqual(before[index], value));
  }
  if (isMap(before) && isMap(after)) {
    return Object.fromEntries(Object.entries(after).map(([key, value]) => [key, reuseEqual(before[key], value)]));
  }
  return after;
};

/** A fresh, unfrozen copy of the containers in `value`; leaves are immutable, so they are shared. */
export const copyValue = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(copyValue);
  }
  if (isMap(value)) {
    return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, copyValue(child)]));
  }
  return value;
};

const put = (path: (string | number)[], value: unknown): Op.Patch => ({ action: 'put', path, value });

const isMap = (value: unknown): value is Record<string, unknown> => Op.isContainer(value) && !Array.isArray(value);
