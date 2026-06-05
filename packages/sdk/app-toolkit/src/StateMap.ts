//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Obj } from '@dxos/echo';
import { FormInputAnnotation } from '@dxos/echo/internal';

/**
 * A per-object state side-map: an in-document `Record<objectId, S>` holding small mutable metadata
 * for each object, keyed by object id.
 *
 * The companion to immutable feed/queue objects: the objects are immutable, so their mutable
 * per-item state (read-marker, hero image, snippet, …) lives here on a host object. Use this for
 * non-tag metadata; boolean labels (starred, archived) belong in the tag model ({@link TagIndex} /
 * {@link Tagging}) so they share the space-wide `Tag` registry.
 */

/** Read/write accessor over a host object's state side-map field, bound to a single field key. */
export interface Accessor<S extends object> {
  /** All object ids with an entry, optionally filtered by a predicate over their state. */
  ids(predicate?: (state: Partial<S>, id: string) => boolean): string[];
  /** The entry for an object id; `{}` when absent (so call sites read fields without `?` chains). */
  get(id: string): Partial<S>;
  /** All `[id, state]` entries. */
  entries(): Array<[string, Partial<S>]>;
  /** Shallow-merges a patch into an object's entry, creating it when absent. */
  patch(id: string, patch: Partial<S>): void;
  /** Removes an object's entry. */
  remove(id: string): void;
}

/**
 * Schema fragment for a state side-map field. Splice into a host Struct. Optional record, hidden
 * from forms. Keyed by object id; the value is the per-object state struct `S`.
 */
export const field = <S, I>(value: Schema.Schema<S, I>) =>
  Schema.Record({ key: Schema.String, value }).pipe(FormInputAnnotation.set(false), Schema.optional);

/** Binds an {@link Accessor} over `host[key]`; all mutations go through `Obj.update`. */
export const bind = <S extends object = Record<string, unknown>>(host: Obj.Any, key: string): Accessor<S> => {
  type Entry = Partial<S>;

  // The field is addressed by a runtime key, so the ECHO object is viewed as a keyed record — a
  // deliberate type-system boundary (dynamic field access — the field name is a parameter).
  const asView = (obj: Obj.Any) => obj as unknown as Record<string, Record<string, Entry> | undefined>;
  const read = (): Record<string, Entry> => asView(host)[key] ?? {};

  // Mutate the live typed record in place (do NOT reassign the whole tree); assigning a detached
  // plain object tree bypasses ECHO's schema-aware conversion. Mutating the typed proxy preserves it.
  const write = (mutate: (record: Record<string, Entry>) => void): void => {
    Obj.update(host, (host) => {
      const view = asView(host);
      if (view[key] === undefined) {
        view[key] = {};
      }
      // Re-read after assignment: the assignment expression yields the plain RHS, not the
      // ECHO-backed reactive record, so mutating that would not persist.
      mutate(view[key]!);
    });
  };

  // Existence check via `Object.keys` — ECHO's reactive record proxy auto-vivifies missing keys on
  // direct access, so `record[id]` is not reliably `undefined` for absent ids.
  const has = (record: Record<string, Entry>, id: string): boolean => Object.keys(record).includes(id);

  return {
    ids: (predicate) => {
      const record = read();
      const keys = Object.keys(record);
      return predicate ? keys.filter((id) => predicate(record[id], id)) : keys;
    },
    get: (id) => {
      const record = read();
      return has(record, id) ? record[id] : {};
    },
    entries: () => {
      const record = read();
      return Object.keys(record).map((id) => [id, record[id]]);
    },
    patch: (id, patch) =>
      write((record) => {
        if (!has(record, id)) {
          record[id] = { ...patch };
        } else {
          Object.assign(record[id], patch);
        }
      }),
    remove: (id) =>
      write((record) => {
        if (has(record, id)) {
          delete record[id];
        }
      }),
  };
};
