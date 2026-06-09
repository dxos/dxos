//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import { Atom } from '@effect-atom/atom-react';
import * as Data from 'effect/Data';
import * as Schema from 'effect/Schema';

import { Annotation, DXN, Obj, Type } from '@dxos/echo';
import { FormInputAnnotation } from '@dxos/echo/internal';
import { type EntityId } from '@dxos/keys';

/**
 * A per-object state side-map: a standalone object holding a `Record<objectId, S>` with small
 * mutable metadata for each object, keyed by object id.
 *
 * The companion to immutable feed/queue objects: the objects are immutable, so their mutable
 * per-item state (read-marker, hero image, snippet, …) lives here on a child object referenced
 * from the feed's host (see {@link Obj.setParent}). Use this for non-tag metadata; boolean labels
 * (starred, archived) belong in the tag model ({@link TagIndex} / {@link Tagging}) so they share
 * the space-wide `Tag` registry.
 *
 * The stored value type is open (`Schema.Any`); callers project the concrete per-object state shape
 * `S` via the typed {@link bind} / {@link atom} views.
 */
export const StateMap = Schema.Struct({
  /** Per-object state keyed by object id. Values are open records projected to `S` by accessors. */
  state: Schema.Record({ key: Obj.ID, value: Schema.Any }).pipe(FormInputAnnotation.set(false)),
}).pipe(
  Annotation.HiddenAnnotation.set(true),
  Type.makeObject(DXN.make('org.dxos.type.stateMap', '0.1.0')),
);

export type StateMap = Type.InstanceType<typeof StateMap>;

/** Creates an empty StateMap object. */
export const make = (): StateMap => Obj.make(StateMap, { state: {} });

/** Checks if a value is a StateMap object. */
export const instanceOf = (value: unknown): value is StateMap => Obj.instanceOf(StateMap, value);

/** Read/write accessor over a {@link StateMap} object, typed to the per-object state shape `S`. */
export interface Accessor<S extends object> {
  /** All object ids with an entry, optionally filtered by a predicate over their state. */
  ids(predicate?: (state: Partial<S>, id: EntityId) => boolean): EntityId[];
  /** The entry for an object id; `{}` when absent (so call sites read fields without `?` chains). */
  get(id: EntityId): Partial<S>;
  /** All `[id, state]` entries. */
  entries(): Array<[EntityId, Partial<S>]>;
  /** Shallow-merges a patch into an object's entry, creating it when absent. */
  patch(id: EntityId, patch: Partial<S>): void;
  /** Removes an object's entry. */
  remove(id: EntityId): void;
}

const shallowEqual = (a: Record<string, unknown>, b: Record<string, unknown>): boolean => {
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) {
    return false;
  }
  return keysA.every((key) => a[key] === b[key]);
};

type SliceKey = readonly [StateMap, EntityId];

const sliceFamily = Atom.family((key: SliceKey) =>
  Atom.make<Record<string, unknown>>((get) => {
    const [stateMap, id] = key;
    const read = (): Record<string, unknown> => bind(stateMap).get(id);
    let previous = read();
    const unsubscribe = Obj.subscribe(stateMap, () => {
      const next = read();
      if (!shallowEqual(previous, next)) {
        previous = next;
        get.setSelf(next);
      }
    });
    get.addFinalizer(() => unsubscribe());
    return previous;
  }),
);

/**
 * Reactive per-key slice of a StateMap. Fires only when the value at `id` changes — sibling keys'
 * mutations are discarded without propagating. Memoized via `Atom.family`.
 */
export const atom = <S extends object>(stateMap: StateMap, id: EntityId): Atom.Atom<Partial<S>> =>
  // The family is keyed/memoized over open `Record<string, unknown>` slices; `S` is a caller-side
  // projection of the open stored value, so the typed view is asserted at this generic boundary.
  sliceFamily(Data.tuple(stateMap, id)) as Atom.Atom<Partial<S>>;

/** Binds an {@link Accessor} over a {@link StateMap} object; all mutations go through `Obj.update`. */
export const bind = <S extends object = Record<string, unknown>>(stateMap: StateMap): Accessor<S> => {
  // Stored values are open (`Schema.Any`); the per-object state shape `S` is projected here. The
  // record's `any` values flow into `Partial<S>` without a cast.
  type StateRecord = Record<string, Partial<S>>;

  const read = (): StateRecord => stateMap.state ?? {};

  // Mutate the live typed record in place (do NOT reassign the whole tree); assigning a detached
  // plain object tree bypasses ECHO's schema-aware conversion. Mutating the typed proxy preserves it.
  const write = (mutate: (record: StateRecord) => void): void => {
    Obj.update(stateMap, (stateMap) => {
      if (stateMap.state === undefined) {
        stateMap.state = {};
      }
      mutate(stateMap.state);
    });
  };

  // Existence check via `Object.keys` — ECHO's reactive record proxy auto-vivifies missing keys on
  // direct access, so `record[id]` is not reliably `undefined` for absent ids.
  const has = (record: StateRecord, id: EntityId): boolean => Object.keys(record).includes(id);

  return {
    ids: (predicate) => {
      const record = read();
      // Keys are object ids by construction; `Object.keys` widens the `EntityId` brand to `string`.
      const keys = Object.keys(record) as EntityId[];
      return predicate ? keys.filter((id) => predicate(record[id], id)) : keys;
    },
    get: (id) => {
      const record = read();
      return has(record, id) ? record[id] : {};
    },
    entries: () => {
      const record = read();
      // Keys are object ids by construction; `Object.keys` widens the `EntityId` brand to `string`.
      return Object.keys(record).map((id) => [id as EntityId, record[id]]);
    },
    patch: (id, patch) =>
      write((record) => {
        // Initialize the sub-map via the ECHO proxy so all subsequent field writes
        // go through the proxy rather than a detached plain object (same principle
        // as TagIndex push/splice: never replace a live proxy value with a plain object).
        if (!has(record, id)) {
          record[id] = {};
        }
        Object.assign(record[id], patch);
      }),
    remove: (id) =>
      write((record) => {
        if (has(record, id)) {
          delete record[id];
        }
      }),
  };
};
