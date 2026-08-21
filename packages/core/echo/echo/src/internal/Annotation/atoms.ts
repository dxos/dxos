//
// Copyright 2026 DXOS.org
//

import * as Option from 'effect/Option';
import * as Atom from 'effect/unstable/reactivity/Atom';

import { assertArgument } from '@dxos/invariant';

import type * as Annotation from '../../Annotation';
import type * as Entity from '../../Entity';
import { memoizePerEntity, memoizePerEntityKey } from '../common/atom-memo';
import { snapshotEquals, snapshotForComparison } from '../common/atom-snapshot';
import { subscribe } from '../common/proxy/reactive';
import { isEntity } from '../Entity';
import { get as getAnnotation } from './entity-dictionary';

/**
 * Atom memo for an annotation value on an entity instance.
 * Mirrors the object-property atom memo: re-emits a fresh reference whenever the entity changes
 * (so an in-place array mutation is observed) and dedupes primitive values via `!==`.
 */
const annotationFamily = memoizePerEntityKey<Entity.Unknown, Annotation.Annotation<any>, Atom.Atom<Option.Option<any>>>(
  (target, annotation) => {
    const read = (): Option.Option<any> => Option.map(getAnnotation(target, annotation), snapshotForComparison);

    return Atom.make<Option.Option<any>>((get) => {
      let previous = read();

      const unsubscribe = subscribe(target, () => {
        const next = read();
        if (!sameOption(previous, next)) {
          previous = next;
          get.setSelf(next);
        }
      });
      get.addFinalizer(() => unsubscribe());

      return previous;
    });
  },
);

/**
 * Atom memo for a single key of a record-valued annotation on an entity instance.
 * Keyed by the entity, then by annotation and key in tables the entity's entry owns, so both inner
 * levels are released with the entity.
 */
const annotationPropertyFamily = memoizePerEntity((target: Entity.Unknown) => {
  const byAnnotation = new Map<Annotation.Annotation<Record<string, any>>, Map<string, Atom.Atom<any>>>();

  const make = (annotation: Annotation.Annotation<Record<string, any>>, key: string): Atom.Atom<any> => {
    const read = (): unknown =>
      getAnnotation(target, annotation).pipe(
        Option.map((value) => snapshotForComparison(value[key])),
        Option.getOrUndefined,
      );

    return Atom.make<unknown>((get) => {
      let previous = read();

      const unsubscribe = subscribe(target, () => {
        const next = read();
        // Content comparison — `read()` snapshots, so identity never matches for arrays/objects.
        if (!snapshotEquals(next, previous)) {
          previous = next;
          get.setSelf(next);
        }
      });
      get.addFinalizer(() => unsubscribe());

      return previous;
    });
  };

  return {
    get: (annotation: Annotation.Annotation<Record<string, any>>, key: string): Atom.Atom<any> => {
      let byKey = byAnnotation.get(annotation);
      if (!byKey) {
        byKey = new Map<string, Atom.Atom<any>>();
        byAnnotation.set(annotation, byKey);
      }
      const existing = byKey.get(key);
      if (existing) {
        return existing;
      }
      const created = make(annotation, key);
      byKey.set(key, created);
      return created;
    },
  };
});

/** Equal when both empty, or both present with shallow-equal content (see `snapshotEquals`). */
const sameOption = <T>(a: Option.Option<T>, b: Option.Option<T>): boolean =>
  Option.isNone(a) || Option.isNone(b) ? Option.isNone(a) && Option.isNone(b) : snapshotEquals(a.value, b.value);

/**
 * Reactive atom for an annotation value on an entity instance. Emits a shallow snapshot (a fresh
 * reference for objects/arrays) so dependent atoms recompute on change. Mirrors {@link makeProperty}.
 */
export const makeAtom = <T>(
  target: Entity.Unknown,
  annotation: Annotation.Annotation<T>,
): Atom.Atom<Option.Option<T>> => {
  assertArgument(isEntity(target), 'target', 'Must be a reactive ECHO entity');
  return annotationFamily(target)(annotation);
};

/**
 * Reactive atom for a single key of a record-valued annotation on an entity instance.
 */
export const makeProperty = <V>(
  target: Entity.Unknown,
  annotation: Annotation.Annotation<Record<string, V>>,
  key: string,
): Atom.Atom<V | undefined> => {
  assertArgument(isEntity(target), 'target', 'Must be a reactive ECHO entity');
  // The memo's key type is a single concrete annotation type, so the generic `V` is erased at that
  // boundary and recovered here; no typed alternative exists for a per-call-generic memo.
  return annotationPropertyFamily(target).get(
    annotation as Annotation.Annotation<Record<string, any>>,
    key,
  ) as Atom.Atom<V | undefined>;
};
