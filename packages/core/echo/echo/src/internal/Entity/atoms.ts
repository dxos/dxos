//
// Copyright 2026 DXOS.org
//

import * as Option from 'effect/Option';
import * as Atom from 'effect/unstable/reactivity/Atom';

import { AtomEx } from '@dxos/effect';
import { defaultMap } from '@dxos/util';

import type * as Annotation from '../../Annotation.ts';
import type * as Entity from '../../Entity.ts';
import { getLabel } from '../Annotation/annotations.ts';
import { get as getAnnotation } from '../Annotation/entity-dictionary.ts';
import { snapshotEquals, snapshotForComparison } from '../common/atom-snapshot.ts';
import { defineHiddenProperty } from '../common/proxy/define-hidden-property.ts';
import { canonicalOf, getProxyTarget, isProxy } from '../common/proxy/proxy-utils.ts';
import { subscribe } from '../common/proxy/reactive.ts';
import { getSnapshot } from '../Obj/snapshot.ts';

export type EntityAtoms<E extends Entity.Unknown> = {
  snapshot(): Atom.Atom<Entity.Snapshot>;
  live(): Atom.Atom<E>;
  label(): Atom.Atom<string | undefined>;
  property<K extends keyof E>(key: K): Atom.Atom<E[K]>;
  annotation<T>(annotation: Annotation.Annotation<T>): Atom.Atom<Option.Option<T>>;
  annotationProperty<V>(annotation: Annotation.Annotation<Record<string, V>>, key: string): Atom.Atom<V | undefined>;
};

const symbolEntityAtoms = Symbol.for('@dxos/echo/EntityAtoms');

export const getEntityAtoms = <E extends Entity.Unknown>(entity: E): EntityAtoms<E> => {
  const canonical: E = canonicalOf(entity);
  const owner = isProxy(canonical) ? getProxyTarget(canonical) : canonical;
  const existing: EntityAtoms<E> | undefined = Reflect.get(owner, symbolEntityAtoms);
  if (existing) {
    return existing;
  }
  const created = makeEntityAtoms(canonical);
  defineHiddenProperty(owner, symbolEntityAtoms, created);
  return created;
};

const makeEntityAtoms = <E extends Entity.Unknown>(entity: E): EntityAtoms<E> => {
  let snapshot: Atom.Atom<Entity.Snapshot> | undefined;
  let live: Atom.Atom<E> | undefined;
  let label: Atom.Atom<string | undefined> | undefined;
  let properties: Map<keyof E, Atom.Atom<any>> | undefined;
  let annotations: Map<Annotation.Annotation<any>, Atom.Atom<Option.Option<any>>> | undefined;
  let annotationProperties: Map<Annotation.Annotation<any>, Map<string, Atom.Atom<any>>> | undefined;

  const readSnapshot = () => getSnapshot(entity) as unknown as Entity.Snapshot;

  return {
    snapshot: () =>
      (snapshot ??= Atom.make((get) => {
        get.addFinalizer(subscribe(entity, () => get.setSelf(readSnapshot())));
        return readSnapshot();
      }).pipe(AtomEx.withLabel('echo:entity:snapshot'))),

    live: () =>
      (live ??= Atom.make((get) => {
        get.addFinalizer(subscribe(entity, () => get.setSelf(entity)));
        return entity;
      }).pipe(
        // The value is always the same object, so identity equality would suppress every notification.
        Atom.withEquality(() => false),
        AtomEx.withLabel('echo:entity:live'),
      )),

    label: () =>
      (label ??= makeDistinctAtom(
        entity,
        () => getLabel(entity),
        (a, b) => a === b,
        (value) => value,
      ).pipe(AtomEx.withLabel('echo:entity:label'))),

    property: <K extends keyof E>(key: K): Atom.Atom<E[K]> =>
      defaultMap((properties ??= new Map()), key, () =>
        makeDistinctAtom(entity, () => entity[key], snapshotEquals, snapshotForComparison).pipe(
          AtomEx.withLabel('echo:entity:property'),
        ),
      ),

    annotation: <T>(annotation: Annotation.Annotation<T>): Atom.Atom<Option.Option<T>> =>
      defaultMap((annotations ??= new Map()), annotation, () =>
        makeDistinctAtom(
          entity,
          () => getAnnotation(entity, annotation),
          sameOption,
          (value) => Option.map(value, snapshotForComparison),
        ).pipe(AtomEx.withLabel('echo:entity:annotation')),
      ),

    annotationProperty: <V>(
      annotation: Annotation.Annotation<Record<string, V>>,
      key: string,
    ): Atom.Atom<V | undefined> =>
      defaultMap(
        defaultMap((annotationProperties ??= new Map()), annotation, () => new Map()),
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
          ).pipe(AtomEx.withLabel('echo:entity:annotation-property')),
      ),
  };
};

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

const sameOption = <T>(a: Option.Option<T>, b: Option.Option<T>): boolean =>
  Option.isNone(a) || Option.isNone(b) ? Option.isNone(a) && Option.isNone(b) : snapshotEquals(a.value, b.value);
