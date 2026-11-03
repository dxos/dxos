//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import { Entity, Ref } from '@dxos/echo';

/**
 * An operation's output in the form it crosses Workers RPC: every live ECHO entity as its JSON form (`@uri`, `@type`,
 * refs as `{ '/': uri }`) and every bare `Ref` encoded, as operation-service returns it.
 *
 * Structured clone copies none of a live entity's properties (`space.addObject`'s `object` arrived as `{ id }` at
 * most), and workerd cannot clone a `Ref` at all.
 */
export const encode = (value: unknown, seen = new WeakSet<object>()): unknown => {
  if (Entity.isEntity(value)) {
    return Entity.toJSON(value);
  }
  if (Ref.isRef(value)) {
    return value.noInline().encode();
  }
  if (value === null || typeof value !== 'object' || seen.has(value)) {
    return value;
  }
  seen.add(value);
  if (Array.isArray(value)) {
    return value.map((entry) => encode(entry, seen));
  }
  // Only plain carriers are walked: a class instance returned on purpose (a `Date`, bytes) clones as itself.
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    return value;
  }
  return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, encode(entry, seen)]));
};
