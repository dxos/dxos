//
// Copyright 2026 DXOS.org
//

import * as Option from 'effect/Option';
import * as Atom from 'effect/unstable/reactivity/Atom';

import type * as Annotation from '../../Annotation.ts';
import type * as Entity from '../../Entity.ts';
import { getLabel } from '../Annotation/annotations.ts';
import { get as getAnnotation } from '../Annotation/entity-dictionary.ts';
import { snapshotEquals, snapshotForComparison } from '../common/atom-snapshot.ts';
import { defineHiddenProperty } from '../common/proxy/define-hidden-property.ts';
import { canonicalOf, getProxyTarget, isProxy } from '../common/proxy/proxy-utils.ts';
import { subscribe } from '../common/proxy/reactive.ts';
import { getSnapshot } from '../Obj/snapshot.ts';

/**
 * Every atom derived from one entity. Each is built on first read and then kept for the entity's
 * lifetime; the registry, not this record, decides how long an unobserved atom's node stays resident.
 */
export type EntityAtoms = {
  /** Snapshot of the entity, re-emitted on every change. */
  readonly snapshot: Atom.Atom<any>;
  /** The live entity, re-emitted on every change. */
  readonly live: Atom.Atom<any>;
  /** Label, emitted only when the computed label changes. */
  readonly label: Atom.Atom<string | undefined>;
  /** Snapshot of one property, emitted only when its content changes. */
  property(key: PropertyKey): Atom.Atom<any>;
  /** Snapshot of one annotation, emitted only when its content changes. */
  annotation(annotation: Annotation.Annotation<any>): Atom.Atom<Option.Option<any>>;
  /** Snapshot of one key of a record-valued annotation, emitted only when its content changes. */
  annotationProperty(annotation: Annotation.Annotation<Record<string, any>>, key: string): Atom.Atom<any>;
};

const symbolEntityAtoms = Symbol('@dxos/echo/EntityAtoms');

/**
 * Non-proxy entities (queue-stored objects and other branded shapes) cannot carry the record and may be
 * minted fresh per read, so they are memoized by id; `subscribe` no-ops for them, so their atoms never
 * update and losing one to collection costs only a rebuild.
 */
const fallback = Atom.family((entity: Entity.Unknown) => makeEntityAtoms(entity));

/**
 * The atoms for `entity`, stored on its proxy target so the entity owns them and they are collected
 * with it. A mutable view resolves to its read-only proxy, so both share one record and no atom
 * captures the callback-scoped write capability.
 */
export const getEntityAtoms = (entity: Entity.Unknown): EntityAtoms => {
  if (!isProxy(entity)) {
    return fallback(entity);
  }
  const target = getProxyTarget(entity);
  const existing: EntityAtoms | undefined = Reflect.get(target, symbolEntityAtoms);
  if (existing) {
    return existing;
  }
  const created = makeEntityAtoms(canonicalOf(entity));
  defineHiddenProperty(target, symbolEntityAtoms, created);
  return created;
};

const makeEntityAtoms = (entity: Entity.Unknown): EntityAtoms => {
  let snapshot: Atom.Atom<any> | undefined;
  let live: Atom.Atom<any> | undefined;
  let label: Atom.Atom<string | undefined> | undefined;
  const properties = new Map<PropertyKey, Atom.Atom<any>>();
  const annotations = new Map<Annotation.Annotation<any>, Atom.Atom<Option.Option<any>>>();
  const annotationProperties = new Map<Annotation.Annotation<Record<string, any>>, Map<string, Atom.Atom<any>>>();

  return {
    get snapshot() {
      return (snapshot ??= Atom.make((get) => {
        get.addFinalizer(subscribe(entity, () => get.setSelf(getSnapshot(entity))));
        return getSnapshot(entity);
      }));
    },

    get live() {
      return (live ??= Atom.make((get) => {
        get.addFinalizer(subscribe(entity, () => get.setSelf(entity)));
        return entity;
      }));
    },

    get label() {
      return (label ??= makeDistinctAtom(
        entity,
        () => getLabel(entity),
        (a, b) => a === b,
      ));
    },

    property: (key) =>
      getOrCreate(properties, key, () =>
        // Content comparison: identity would be unequal for every array/object, firing on any mutation.
        makeDistinctAtom(entity, () => (entity as any)[key], snapshotEquals, snapshotForComparison),
      ),

    annotation: (annotation) =>
      getOrCreate(annotations, annotation, () =>
        makeDistinctAtom(
          entity,
          () => Option.map(getAnnotation(entity, annotation), snapshotForComparison),
          sameOption,
        ),
      ),

    annotationProperty: (annotation, key) =>
      getOrCreate(
        getOrCreate(annotationProperties, annotation, () => new Map()),
        key,
        () =>
          makeDistinctAtom(
            entity,
            () =>
              getAnnotation(entity, annotation).pipe(
                Option.map((value) => snapshotForComparison(value[key])),
                Option.getOrUndefined,
              ),
            snapshotEquals,
          ),
      ),
  };
};

/**
 * An atom over `read` that re-emits `emit(value)` only when `equals` reports a change against the last
 * emitted value, so `emit` (a snapshot copy) runs on change rather than on every notification.
 */
const makeDistinctAtom = <T>(
  entity: Entity.Unknown,
  read: () => T,
  equals: (value: T, previous: T) => boolean,
  emit: (value: T) => T = (value) => value,
): Atom.Atom<T> =>
  Atom.make((get) => {
    let previous = emit(read());
    get.addFinalizer(
      subscribe(entity, () => {
        const next = read();
        if (!equals(next, previous)) {
          previous = emit(next);
          get.setSelf(previous);
        }
      }),
    );
    return previous;
  });

/** Equal when both empty, or both present with shallow-equal content (see `snapshotEquals`). */
const sameOption = <T>(a: Option.Option<T>, b: Option.Option<T>): boolean =>
  Option.isNone(a) || Option.isNone(b) ? Option.isNone(a) && Option.isNone(b) : snapshotEquals(a.value, b.value);

const getOrCreate = <K, V>(map: Map<K, V>, key: K, make: () => V): V => {
  const existing = map.get(key);
  if (existing !== undefined) {
    return existing;
  }
  const created = make();
  map.set(key, created);
  return created;
};
