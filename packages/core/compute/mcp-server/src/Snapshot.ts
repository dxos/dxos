//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import { Entity } from '@dxos/echo';

/**
 * Replaces live ECHO entities in an operation's output with wire snapshots.
 *
 * An operation returning a live object is the right call in-process — the caller gets a reactive,
 * mutable handle — but a proxy carries none of its properties through JSON, so an MCP client would
 * see an empty value where the schema promised an object. Snapshotting keeps the operation
 * dual-use rather than making authors pick an audience.
 */
export const entities = (value: unknown, seen = new WeakSet<object>()): unknown => {
  if (Entity.isEntity(value)) {
    return Entity.toJSON(value);
  }
  if (value == null || typeof value !== 'object' || seen.has(value)) {
    return value;
  }
  seen.add(value);
  if (Array.isArray(value)) {
    return value.map((entry) => entities(entry, seen));
  }
  // Plain carriers only: a class instance the operation deliberately returns (Date, Uint8Array, …)
  // is left alone rather than shallow-copied into a bare object.
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    return value;
  }
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, entry]) => [key, entities(entry, seen)]),
  );
};
