//
// Copyright 2026 DXOS.org
//

import * as Atom from '@effect-atom/atom/Atom';
import * as Data from 'effect/Data';
import * as Option from 'effect/Option';

import { assertArgument } from '@dxos/invariant';

import type * as Annotation from '../../Annotation';
import type * as Entity from '../../Entity';
import { snapshotForComparison } from '../common/atom-snapshot';
import { subscribe } from '../common/proxy/reactive';
import { isEntity } from '../Entity';
import { get as getAnnotation } from './entity-dictionary';

/**
 * Atom family for an annotation value on an entity instance.
 * Mirrors the object-property atom family: re-emits a fresh reference whenever the entity changes
 * (so an in-place array mutation is observed) and dedupes primitive values via `!==`.
 */
const annotationFamily = Atom.family((target: Entity.Unknown) =>
  Atom.family(<T>(annotation: Annotation.Annotation<T>): Atom.Atom<Option.Option<T>> => {
    const read = (): Option.Option<T> => Option.map(getAnnotation(target, annotation), snapshotForComparison);

    return Atom.make<Option.Option<T>>((get) => {
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
    }).pipe(Atom.keepAlive);
  }),
);

/**
 * Atom family for a single key of a record-valued annotation on an entity instance.
 * Keyed by a value-equal `Data.tuple([target, annotation, key])` so nested families are avoided.
 */
const annotationPropertyFamily = Atom.family(
  ([target, annotation, key]: readonly [
    Entity.Unknown,
    Annotation.Annotation<Record<string, any>>,
    string,
  ]): Atom.Atom<any> => {
    const read = (): unknown =>
      getAnnotation(target, annotation).pipe(
        Option.map((value) => snapshotForComparison(value[key])),
        Option.getOrUndefined,
      );

    return Atom.make<unknown>((get) => {
      let previous = read();

      const unsubscribe = subscribe(target, () => {
        const next = read();
        if (next !== previous) {
          previous = next;
          get.setSelf(next);
        }
      });
      get.addFinalizer(() => unsubscribe());

      return previous;
    }).pipe(Atom.keepAlive);
  },
);

/** Equal when both empty, or both present with the same (snapshotted) value. */
const sameOption = <T>(a: Option.Option<T>, b: Option.Option<T>): boolean =>
  Option.isNone(a) || Option.isNone(b) ? Option.isNone(a) && Option.isNone(b) : a.value === b.value;

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
  // The flattened family key is a single concrete tuple type, so the generic `V` is erased at the
  // family boundary and recovered here; no typed alternative exists for a per-call-generic family.
  return annotationPropertyFamily(
    Data.tuple(target, annotation as Annotation.Annotation<Record<string, any>>, key),
  ) as Atom.Atom<V | undefined>;
};
