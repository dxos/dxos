//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { FormInputAnnotation } from './internal';
import * as Obj from './Obj';

/**
 * An inverse tag index: an in-document `Record<tagId, objectId[]>` mapping a tag id to the ids of
 * the objects carrying that tag.
 *
 * Mutable database objects track their tags in `Obj.getMeta(obj).tags` (an array of tag ids).
 * Immutable feed/queue objects cannot carry their own meta, so this index — managed alongside the
 * feed on its host object — augments that same process for them. Tags are sparse, so keying by tag
 * id (rather than object id) keeps the index small and makes "filter the feed by tag" a single
 * lookup.
 *
 * The tag id is an existing {@link Tag} object's id/URI; labels are never duplicated here — they
 * live on the {@link Tag} object and stay editable in one place.
 */

/** Read/write accessor over a host object's tag-index field, bound to a single field key. */
export interface Accessor {
  /** All tag ids present in the index. */
  tagIds(): string[];
  /** Object ids carrying the given tag; `[]` when the tag is absent (filter the feed by tag). */
  objects(tagId: string): readonly string[];
  /** Inverse lookup: the tag ids applied to the given object id. */
  tags(objectId: string): string[];
  /** Applies a tag to an object (creating the tag entry when absent); idempotent. */
  setTag(tagId: string, objectId: string): void;
  /** Removes a tag from an object, pruning the tag entry when it empties. */
  unsetTag(tagId: string, objectId: string): void;
}

/**
 * Schema fragment for a tag-index field. Splice into a host Struct. Optional record, hidden from
 * forms. Keyed by tag id; the value is the array of object ids carrying that tag.
 */
export const field = () =>
  Schema.Record({ key: Schema.String, value: Schema.Array(Obj.ID) }).pipe(
    FormInputAnnotation.set(false),
    Schema.optional,
  );

/** Binds an {@link Accessor} over `host[key]`; all mutations go through `Obj.update`. */
export const bind = (host: Obj.Any, key: string): Accessor => {
  type Record_ = Record<string, string[]>;

  // The field is addressed by a runtime key, so the ECHO object is viewed as a keyed record — a
  // deliberate type-system boundary (dynamic field access — the field name is a parameter).
  const asView = (obj: Obj.Any) => obj as unknown as Record<string, Record_ | undefined>;
  const read = (): Record_ => asView(host)[key] ?? {};

  // Mutate the live typed record in place (do NOT reassign the whole tree); assigning a detached
  // plain object tree bypasses ECHO's schema-aware conversion and stores arrays as numeric-keyed
  // objects. Mutating the typed proxy (and assigning real arrays to its values) preserves arrays.
  const write = (mutate: (record: Record_) => void): void => {
    Obj.update(host, (draft) => {
      const view = asView(draft);
      if (view[key] === undefined) {
        view[key] = {};
      }
      // Re-read after assignment: the assignment expression yields the plain RHS, not the
      // ECHO-backed reactive record, so mutating that would not persist.
      mutate(view[key]!);
    });
  };

  // Existence check via `Object.keys` — ECHO's reactive record proxy auto-vivifies missing keys on
  // direct access, so `record[tagId]` is not reliably `undefined` for absent tags.
  const has = (record: Record_, tagId: string): boolean => Object.keys(record).includes(tagId);

  return {
    tagIds: () => Object.keys(read()),
    objects: (tagId) => {
      const record = read();
      return has(record, tagId) ? record[tagId] : [];
    },
    tags: (objectId) => {
      const record = read();
      return Object.keys(record).filter((tagId) => record[tagId].includes(objectId));
    },
    setTag: (tagId, objectId) =>
      write((record) => {
        const objects = record[tagId];
        if (!objects) {
          record[tagId] = [objectId];
        } else if (!objects.includes(objectId)) {
          record[tagId] = [...objects, objectId];
        }
      }),
    unsetTag: (tagId, objectId) =>
      write((record) => {
        if (!has(record, tagId)) {
          return;
        }
        const next = record[tagId].filter((existing) => existing !== objectId);
        if (next.length === 0) {
          delete record[tagId];
        } else {
          record[tagId] = next;
        }
      }),
  };
};
