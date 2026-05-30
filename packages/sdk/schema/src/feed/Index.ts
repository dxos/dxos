//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Obj } from '@dxos/echo';
import { FormInputAnnotation } from '@dxos/echo/internal';

/**
 * A group / inverse index: an in-document `Record<groupKey, { ids, ...extra }>` grouping object
 * ids under a key (e.g. tag → message ids, kanban column → card ids). Distinct from a per-item
 * metadata side-map: the value is a membership array, not per-object state.
 *
 * The value carries an optional per-group metadata struct (`extra`) alongside the `ids` array,
 * so a group can hold its own fields (e.g. a tag's label/hue, a column's `hidden` flag).
 */

/** A group's membership: object ids belonging to the group, in insertion order. */
export type Members = readonly string[];

/** Read/write accessor over a host object's index field, bound to a single field key. */
export interface Accessor<Extra extends object = {}> {
  /** All group keys present in the index. */
  groups(): string[];
  /** Member ids of a group; `[]` when the group is absent. */
  members(group: string): Members;
  /** Inverse lookup: the groups that contain the given id. */
  groupsOf(id: string): string[];
  /** Per-group metadata (the value sans its `ids` array); `{}` when absent. */
  meta(group: string): Partial<Extra>;
  /** Adds an id to a group (creating the group when absent), optionally merging metadata. */
  add(group: string, id: string, extra?: Partial<Extra>): void;
  /** Removes an id from a group, pruning the group when it empties. */
  remove(group: string, id: string): void;
  /** Merges metadata into a group (creating an empty group when absent). */
  setMeta(group: string, patch: Partial<Extra>): void;
}

/**
 * Schema fragment for an index field. Splice into a host Struct. Optional record, hidden from forms.
 * `extra` adds per-group fields stored beside the membership `ids` array.
 */
export const field = <Extra extends Schema.Struct.Fields = {}>(options?: { extra?: Extra }) =>
  Schema.Record({
    key: Schema.String,
    value: Schema.Struct({ ids: Schema.Array(Obj.ID), ...(options?.extra ?? {}) }),
  }).pipe(FormInputAnnotation.set(false), Schema.optional);

/** Binds an {@link Accessor} over `host[key]`; all mutations go through `Obj.update`. */
export const bind = <Extra extends object = {}>(host: Obj.Any, key: string): Accessor<Extra> => {
  // Stored entries carry only the ids plus whatever extra was supplied, so extra is partial here.
  type Entry = { ids: string[] } & Partial<Extra>;

  // Index entries are addressed by a runtime key; viewing the ECHO object as a keyed record is a
  // deliberate type-system boundary (dynamic field access — the field name is a parameter).
  const asView = (obj: Obj.Any) => obj as unknown as Record<string, Record<string, Entry> | undefined>;
  const read = (): Record<string, Entry> => asView(host)[key] ?? {};

  // Mutate the live typed record in place (do NOT reassign the whole tree); assigning a detached
  // plain object tree bypasses ECHO's schema-aware conversion and stores arrays as numeric-keyed
  // objects. Mutating the typed proxy (and assigning real arrays to its fields) preserves arrays.
  const write = (mutate: (record: Record<string, Entry>) => void): void => {
    Obj.update(host, (draft) => {
      const view = asView(draft);
      if (view[key] === undefined) {
        view[key] = {};
      }
      // Re-read after assignment: the `??=`/assignment expression yields the plain RHS, not the
      // ECHO-backed reactive record, so mutating that would not persist.
      mutate(view[key]!);
    });
  };

  // Existence check via `Object.keys` — ECHO's reactive record proxy auto-vivifies missing keys on
  // direct access, so `record[group]` is not reliably `undefined` for absent groups.
  const has = (record: Record<string, Entry>, group: string): boolean => Object.keys(record).includes(group);

  return {
    groups: () => Object.keys(read()),
    members: (group) => {
      const record = read();
      return has(record, group) ? record[group].ids : [];
    },
    groupsOf: (id) => {
      const record = read();
      return Object.keys(record).filter((group) => record[group].ids.includes(id));
    },
    meta: (group) => {
      const record = read();
      if (!has(record, group)) {
        return {};
      }
      const { ids: _ids, ...rest } = record[group];
      return rest;
    },
    add: (group, id, extra) =>
      write((record) => {
        const entry = record[group];
        if (!entry) {
          record[group] = { ids: [id], ...(extra ?? {}) };
        } else {
          if (!entry.ids.includes(id)) {
            entry.ids = [...entry.ids, id];
          }
          if (extra) {
            Object.assign(entry, extra);
          }
        }
      }),
    remove: (group, id) =>
      write((record) => {
        const entry = record[group];
        if (!entry) {
          return;
        }
        const ids = entry.ids.filter((existing) => existing !== id);
        if (ids.length === 0) {
          delete record[group];
        } else {
          entry.ids = ids;
        }
      }),
    setMeta: (group, patch) =>
      write((record) => {
        const entry = record[group];
        if (!entry) {
          record[group] = { ids: [], ...patch };
        } else {
          Object.assign(entry, patch);
        }
      }),
  };
};
