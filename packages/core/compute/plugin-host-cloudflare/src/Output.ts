//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import { Entity, Ref } from '@dxos/echo';

export type EncodeOptions = {
  /** `json` (the default) for a caller that cannot load the entity; `reference` for one that shares its database. */
  readonly entities?: 'json' | 'reference';
};

/**
 * An operation's output in the form it crosses Workers RPC: every live ECHO entity as its JSON form (`@uri`, `@type`,
 * refs as `{ '/': uri }`) and every bare `Ref` encoded, as operation-service returns it.
 *
 * Structured clone copies none of a live entity's properties (`space.addObject`'s `object` arrived as `{ id }` at
 * most), and workerd cannot clone a `Ref` at all.
 */
export const encode = (value: unknown, options: EncodeOptions = {}, seen = new WeakSet<object>()): unknown => {
  if (Entity.isEntity(value)) {
    return options.entities === 'reference' ? { '/': Entity.getURI(value).toString() } : Entity.toJSON(value);
  }
  if (Ref.isRef(value)) {
    return value.noInline().encode();
  }
  if (value === null || typeof value !== 'object' || seen.has(value)) {
    return value;
  }
  // Only plain carriers are walked: a class instance returned on purpose (a `Date`, bytes) clones as itself.
  const prototype = Object.getPrototypeOf(value);
  if (!Array.isArray(value) && prototype !== Object.prototype && prototype !== null) {
    return value;
  }
  // `seen` holds the ancestors only, so a cycle stops the walk while an object shared by two fields is encoded twice.
  seen.add(value);
  try {
    return Array.isArray(value)
      ? value.map((entry) => encode(entry, options, seen))
      : Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, encode(entry, options, seen)]));
  } finally {
    seen.delete(value);
  }
};

/**
 * The type-side form of an output that crossed EDGE: each entity's JSON form (an object with `@uri` and `@type`) is
 * replaced by `load(uri)` and each `{ '/': uri }` by `ref(uri)`, in plain objects and arrays.
 */
export const decodeEntities = async (
  value: unknown,
  load: (uri: string) => Promise<unknown>,
  ref: (uri: string) => unknown,
): Promise<unknown> => {
  if (value === null || typeof value !== 'object') {
    return value;
  }
  if (Array.isArray(value)) {
    return Promise.all(value.map((entry) => decodeEntities(entry, load, ref)));
  }
  const uri = Reflect.get(value, '@uri');
  if (typeof uri === 'string' && typeof Reflect.get(value, '@type') === 'string') {
    return load(uri);
  }
  const target = Reflect.get(value, '/');
  if (typeof target === 'string' && Object.keys(value).length === 1) {
    return ref(target);
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    return value;
  }
  return Object.fromEntries(
    await Promise.all(
      Object.entries(value).map(async ([key, entry]) => [key, await decodeEntities(entry, load, ref)] as const),
    ),
  );
};
