//
// Copyright 2026 DXOS.org
//

import * as Option from 'effect/Option';
import * as Atom from 'effect/unstable/reactivity/Atom';

import type * as Annotation from '../../Annotation.ts';
import type * as Entity from '../../Entity.ts';
import { getLabel } from '../Annotation/annotations.ts';
import { get as getAnnotation } from '../Annotation/entity-dictionary.ts';
import { withLabel } from '../common/atom-label.ts';
import { snapshotEquals, snapshotForComparison } from '../common/atom-snapshot.ts';
import { defineHiddenProperty } from '../common/proxy/define-hidden-property.ts';
import { canonicalOf, getProxyTarget, isProxy } from '../common/proxy/proxy-utils.ts';
import { subscribe } from '../common/proxy/reactive.ts';
import { getSnapshot } from '../Obj/snapshot.ts';

/**
 * Every atom derived from one entity. Each is built on first read and then kept for the entity's
 * lifetime; the registry, not this record, decides how long an unobserved atom's node stays resident.
 * Values are `unknown` because the record is shared by every typed accessor; each accessor narrows.
 */
export type EntityAtoms = {
  /** Snapshot of the entity, re-emitted on every change. */
  readonly snapshot: Atom.Atom<unknown>;
  /** The live entity, re-emitted on every change. */
  readonly live: Atom.Atom<unknown>;
  /** Label, emitted only when the computed label changes. */
  readonly label: Atom.Atom<string | undefined>;
  /** Snapshot of one property, emitted only when its content changes. */
  property(key: PropertyKey): Atom.Atom<unknown>;
  /** Snapshot of one annotation, emitted only when its content changes. */
  annotation(annotation: Annotation.Annotation<any>): Atom.Atom<Option.Option<unknown>>;
  /** Snapshot of one key of a record-valued annotation, emitted only when its content changes. */
  annotationProperty(annotation: Annotation.Annotation<Record<string, any>>, key: string): Atom.Atom<unknown>;
};

// `Symbol.for`, like the other target keys in `proxy-utils.ts`: a second copy of this module must find the same record.
const symbolEntityAtoms = Symbol.for('@dxos/echo/EntityAtoms');

/**
 * The atoms for `entity`, stored on the object that owns its state (the proxy target, or the entity
 * itself when it is not a proxy) so they are collected with it. A mutable view resolves to its
 * read-only proxy, so both share one record and no atom captures the callback-scoped write capability.
 */
export const getEntityAtoms = (entity: Entity.Unknown): EntityAtoms => {
  const owner = isProxy(entity) ? getProxyTarget(entity) : entity;
  const existing: EntityAtoms | undefined = Reflect.get(owner, symbolEntityAtoms);
  if (existing) {
    return existing;
  }
  const created = makeEntityAtoms(canonicalOf(entity));
  // A frozen non-proxy entity cannot own the record; `subscribe` no-ops for it, so fresh atoms are equivalent.
  if (Object.isExtensible(owner)) {
    defineHiddenProperty(owner, symbolEntityAtoms, created);
  }
  return created;
};

const makeEntityAtoms = (entity: Entity.Unknown): EntityAtoms => {
  let snapshot: Atom.Atom<unknown> | undefined;
  let live: Atom.Atom<unknown> | undefined;
  let label: Atom.Atom<string | undefined> | undefined;
  let properties: Map<PropertyKey, Atom.Atom<unknown>> | undefined;
  let annotations: Map<Annotation.Annotation<any>, Atom.Atom<Option.Option<unknown>>> | undefined;
  let annotationProperties: Map<Annotation.Annotation<any>, Map<string, Atom.Atom<unknown>>> | undefined;

  return {
    get snapshot() {
      return (snapshot ??= Atom.make((get) => {
        get.addFinalizer(subscribe(entity, () => get.setSelf(getSnapshot(entity))));
        return getSnapshot(entity);
      }).pipe(withLabel('echo:entity:snapshot')));
    },

    get live() {
      return (live ??= Atom.make((get) => {
        get.addFinalizer(subscribe(entity, () => get.setSelf(entity)));
        return entity;
      }).pipe(withLabel('echo:entity:live')));
    },

    get label() {
      return (label ??= makeDistinctAtom(
        entity,
        () => getLabel(entity),
        (a, b) => a === b,
        (value) => value,
      ).pipe(withLabel('echo:entity:label')));
    },

    property: (key) =>
      getOrCreate((properties ??= new Map()), key, () =>
        // Content comparison: identity would be unequal for every array/object, firing on any mutation.
        makeDistinctAtom(entity, () => (entity as any)[key], snapshotEquals, snapshotForComparison).pipe(
          withLabel('echo:entity:property'),
        ),
      ),

    annotation: (annotation) =>
      getOrCreate((annotations ??= new Map()), annotation, () =>
        makeDistinctAtom(
          entity,
          () => getAnnotation(entity, annotation),
          sameOption,
          (value) => Option.map(value, snapshotForComparison),
        ).pipe(withLabel('echo:entity:annotation')),
      ),

    annotationProperty: (annotation, key) =>
      getOrCreate(
        getOrCreate((annotationProperties ??= new Map()), annotation, () => new Map()),
        key,
        () =>
          makeDistinctAtom(
            entity,
            () =>
              getAnnotation(entity, annotation).pipe(
                Option.map((value) => value[key]),
                Option.getOrUndefined,
              ),
            snapshotEquals,
            snapshotForComparison,
          ).pipe(withLabel('echo:entity:annotation-property')),
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
  emit: (value: T) => T,
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
