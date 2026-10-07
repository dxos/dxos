//
// Copyright 2026 DXOS.org
//

import { Entity } from '@dxos/echo';

/**
 * Replaces live ECHO entities in an operation's output with wire snapshots.
 *
 * An operation returning a live object is the right call in-process — the caller gets a reactive,
 * mutable handle — but a proxy carries none of its properties through JSON, so an MCP client would
 * see an empty value where the schema promised an object. Snapshotting keeps the operation
 * dual-use rather than making authors pick an audience.
 */
export const entities = (value: unknown, seen = new WeakMap<object, unknown>()): unknown => {
  if (Entity.isEntity(value)) {
    return Entity.toJSON(value);
  }
  if (value == null || typeof value !== 'object') {
    return value;
  }
  // Keyed by the converted counterpart, not merely visited: an object reached twice must yield the
  // snapshot both times, or the second branch hands back the live entities the first one replaced.
  const converted = seen.get(value);
  if (converted !== undefined) {
    return converted;
  }
  if (Array.isArray(value)) {
    // Registered before descending, so a cycle finds the copy being filled instead of recursing.
    const copy: unknown[] = [];
    seen.set(value, copy);
    for (const entry of value) {
      copy.push(entities(entry, seen));
    }
    return copy;
  }
  // Plain carriers only: a class instance the operation deliberately returns (Date, Uint8Array, …)
  // is left alone rather than shallow-copied into a bare object.
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    return value;
  }
  const copy: Record<string, unknown> = {};
  seen.set(value, copy);
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    copy[key] = entities(entry, seen);
  }
  return copy;
};
