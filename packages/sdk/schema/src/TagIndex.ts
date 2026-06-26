//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import { Atom } from '@effect-atom/atom-react';
import * as Data from 'effect/Data';
import * as Schema from 'effect/Schema';

import { Annotation, DXN, Obj, Type } from '@dxos/echo';
import { FormInputAnnotation } from '@dxos/echo/Annotation';
import { type EntityId } from '@dxos/keys';

/**
 * An inverse tag index: a standalone object holding a `Record<tagId, objectId[]>` mapping a tag id
 * to the ids of the objects carrying that tag.
 *
 * Mutable database objects track their tags in `Obj.getMeta(obj).tags` (an array of tag ids).
 * Immutable feed/queue objects cannot carry their own meta, so this index — referenced from the
 * feed's host object as a child (see {@link Obj.setParent}) — augments that same process for them.
 * Tags are sparse, so keying by tag id (rather than object id) keeps the index small and makes
 * "filter the feed by tag" a single lookup.
 *
 * The tag id is an existing {@link Tag} object's id/URI; labels are never duplicated here — they
 * live on the {@link Tag} object and stay editable in one place.
 */
export class TagIndex extends Type.makeObject<TagIndex>(DXN.make('org.dxos.type.tagIndex', '0.1.0'))(
  Schema.Struct({
    /** Inverse index keyed by tag id; the value is the array of object ids carrying that tag. */
    index: Schema.Record({ key: Schema.String, value: Schema.Array(Obj.ID) }).pipe(FormInputAnnotation.set(false)),
  }).pipe(Annotation.HiddenAnnotation.set(true)),
) {}

/** Creates an empty TagIndex object. */
export const make = (): TagIndex => Obj.make(TagIndex, { index: {} });

/** Checks if a value is a TagIndex object. */
export const instanceOf = (value: unknown): value is TagIndex => Obj.instanceOf(TagIndex, value);

/** Read/write accessor over a {@link TagIndex} object. */
export interface Accessor {
  /** All tag ids present in the index. */
  tagIds(): string[];
  /** Object ids carrying the given tag; `[]` when the tag is absent (filter the feed by tag). */
  objects(tagId: string): readonly EntityId[];
  /** Inverse lookup: the tag ids applied to the given object id. */
  tags(objectId: EntityId): string[];
  /** Applies a tag to an object (creating the tag entry when absent); idempotent. */
  setTag(tagId: string, objectId: EntityId): void;
  /** Removes a tag from an object, pruning the tag entry when it empties. */
  unsetTag(tagId: string, objectId: EntityId): void;
}

type TagKey = readonly [TagIndex, EntityId, string | undefined];

const tagFamily = Atom.family((key: TagKey) =>
  Atom.make<boolean>((get) => {
    const [tagIndex, objectId, tagUri] = key;
    const read = (): boolean => {
      if (!tagUri) {
        return false;
      }
      return bind(tagIndex).objects(tagUri).includes(objectId);
    };
    let previous = read();
    const unsubscribe = Obj.subscribe(tagIndex, () => {
      const next = read();
      if (next !== previous) {
        previous = next;
        get.setSelf(next);
      }
    });
    get.addFinalizer(() => unsubscribe());
    return previous;
  }),
);

/**
 * Reactive boolean for whether `objectId` carries `tagUri` in a TagIndex. Fires only when
 * membership for this specific object+tag changes. Memoized via `Atom.family`.
 */
export const atom = (tagIndex: TagIndex, objectId: EntityId, tagUri: string | undefined): Atom.Atom<boolean> =>
  tagFamily(Data.tuple(tagIndex, objectId, tagUri));

/** Binds an {@link Accessor} over a {@link TagIndex} object; all mutations go through `Obj.update`. */
export const bind = (tagIndex: TagIndex): Accessor => {
  const read = (): TagIndex['index'] => tagIndex.index ?? {};

  // Mutate the live typed record in place (do NOT reassign the whole tree); assigning a detached
  // plain object tree bypasses ECHO's schema-aware conversion and stores arrays as numeric-keyed
  // objects. Mutating the typed proxy (and assigning real arrays to its values) preserves arrays.
  const write = (mutate: (index: Record<string, EntityId[]>) => void): void => {
    Obj.update(tagIndex, (tagIndex) => {
      if (tagIndex.index === undefined) {
        tagIndex.index = {};
      }
      mutate(tagIndex.index);
    });
  };

  // Existence check via `Object.keys` — ECHO's reactive record proxy auto-vivifies missing keys on
  // direct access, so `index[tagId]` is not reliably `undefined` for absent tags.
  const has = (index: TagIndex['index'], tagId: string): boolean => Object.keys(index).includes(tagId);

  return {
    tagIds: () => Object.keys(read()),
    objects: (tagId) => {
      const index = read();
      return has(index, tagId) ? index[tagId] : [];
    },
    tags: (objectId) => {
      const index = read();
      return Object.keys(index).filter((tagId) => index[tagId].includes(objectId));
    },
    setTag: (tagId, objectId) =>
      write((index) => {
        // Use `has` (not `index[tagId]`) for absence — the proxy auto-vivifies missing keys.
        if (!has(index, tagId)) {
          index[tagId] = [objectId];
        } else if (!index[tagId].includes(objectId)) {
          // push() mutates in place → O(1) Automerge op (list insert).
          // spread-replace would emit O(n) ops per call → quadratic history (DX-984).
          index[tagId].push(objectId);
        }
      }),
    unsetTag: (tagId, objectId) =>
      write((index) => {
        if (!has(index, tagId)) {
          return;
        }
        const at = index[tagId].indexOf(objectId);
        if (at === -1) {
          return;
        }
        // splice() removes in place → O(1) Automerge op (list delete).
        // filter-replace would emit O(n) ops per call → quadratic history (DX-984).
        index[tagId].splice(at, 1);
        if (index[tagId].length === 0) {
          delete index[tagId];
        }
      }),
  };
};
