//
// Copyright 2026 DXOS.org
//

import * as Atom from '@effect-atom/atom/Atom';
import * as Option from 'effect/Option';

import { assertArgument } from '@dxos/invariant';

import type * as Annotation from '../../Annotation';
import type * as Entity from '../../Entity';
import { subscribe } from '../common/proxy/reactive';
import { isEntity } from '../Entity';
import { type Ref, RefTypeId } from '../Ref/ref';
import { get as getAnnotation } from './entity-dictionary';

const isRef = (value: unknown): value is { uri: string } =>
  value != null && typeof value === 'object' && RefTypeId in value;

/**
 * Immutable projection of an annotation value: each {@link Ref} collapses to its `uri`, arrays and
 * records are copied. This is what the annotation atoms emit.
 *
 * Annotation values are live reactive objects; emitting them directly is unsound for reactivity (an
 * in-place splice keeps the same array reference, so dependent atoms would not recompute) and for
 * serialization (a ref's loaded target may be large or cyclic). The snapshot gives a fresh reference
 * and never touches ref targets, so reorders are observed while unrelated changes are ignored, and the
 * same value drives both change detection and emission.
 */
export type AnnotationSnapshot<T> =
  T extends Ref<any>
    ? string
    : T extends ReadonlyArray<infer U>
      ? Array<AnnotationSnapshot<U>>
      : T extends object
        ? { [K in keyof T]: AnnotationSnapshot<T[K]> }
        : T;

const snapshot = (value: unknown): unknown => {
  if (isRef(value)) {
    return value.uri;
  }
  if (Array.isArray(value)) {
    return value.map(snapshot);
  }
  if (value !== null && typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const key of Object.keys(value)) {
      result[key] = snapshot((value as Record<string, unknown>)[key]);
    }
    return result;
  }
  return value;
};

// Conditional return type can't be proven from the recursive implementation; the runtime shape matches.
// The caller names the result type (the input is the live `Mutable<...>` value, hence `unknown`).
const toSnapshot = <Result>(value: unknown): Result => snapshot(value) as Result;

/** Structural equality over {@link toSnapshot} output (plain, ref-free, acyclic). */
const snapshotEqual = (a: unknown, b: unknown): boolean => {
  if (a === b) {
    return true;
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((element, index) => snapshotEqual(element, b[index]));
  }
  if (a !== null && typeof a === 'object' && b !== null && typeof b === 'object') {
    const aRecord = a as Record<string, unknown>;
    const bRecord = b as Record<string, unknown>;
    const aKeys = Object.keys(aRecord);
    const bKeys = Object.keys(bRecord);
    return aKeys.length === bKeys.length && aKeys.every((key) => snapshotEqual(aRecord[key], bRecord[key]));
  }
  return false;
};

const optionSnapshotEqual = (a: Option.Option<unknown>, b: Option.Option<unknown>): boolean =>
  Option.isNone(a) || Option.isNone(b) ? Option.isNone(a) && Option.isNone(b) : snapshotEqual(a.value, b.value);

/**
 * Atom family for an annotation value on an entity instance.
 * Fires only when the (snapshotted) annotation value changes.
 */
const annotationFamily = Atom.family((target: Entity.Unknown) =>
  Atom.family(<T>(annotation: Annotation.Annotation<T>): Atom.Atom<Option.Option<AnnotationSnapshot<T>>> => {
    const read = (): Option.Option<AnnotationSnapshot<T>> =>
      getAnnotation(target, annotation).pipe(Option.map((value) => toSnapshot<AnnotationSnapshot<T>>(value)));

    return Atom.make<Option.Option<AnnotationSnapshot<T>>>((get) => {
      let previous = read();

      const unsubscribe = subscribe(target, () => {
        const next = read();
        if (!optionSnapshotEqual(previous, next)) {
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
 * Reactivity is scoped to that one key: the atom fires only when its own slice changes.
 */
const annotationPropertyFamily = Atom.family((target: Entity.Unknown) =>
  Atom.family(<V>(annotation: Annotation.Annotation<Record<string, V>>) =>
    Atom.family((key: string): Atom.Atom<AnnotationSnapshot<V> | undefined> => {
      const read = (): AnnotationSnapshot<V> | undefined =>
        getAnnotation(target, annotation).pipe(
          Option.map((value) => toSnapshot<AnnotationSnapshot<V>>(value[key])),
          Option.getOrUndefined,
        );

      return Atom.make<AnnotationSnapshot<V> | undefined>((get) => {
        let previous = read();

        const unsubscribe = subscribe(target, () => {
          const next = read();
          if (!snapshotEqual(previous, next)) {
            previous = next;
            get.setSelf(next);
          }
        });
        get.addFinalizer(() => unsubscribe());

        return previous;
      }).pipe(Atom.keepAlive);
    }),
  ),
);

/**
 * Reactive atom for an annotation value on an entity instance. Emits an immutable {@link AnnotationSnapshot}
 * (refs as their uri) so dependent atoms recompute on change. Mirrors {@link makeProperty}.
 */
export const makeAtom = <T>(
  target: Entity.Unknown,
  annotation: Annotation.Annotation<T>,
): Atom.Atom<Option.Option<AnnotationSnapshot<T>>> => {
  assertArgument(isEntity(target), 'target', 'Must be a reactive ECHO entity');
  return annotationFamily(target)(annotation);
};

/**
 * Reactive atom for a single key of a record-valued annotation on an entity instance. Emits an immutable
 * {@link AnnotationSnapshot} of the slice (e.g. `string[]` of ref uris for a `Record<string, Ref[]>` annotation).
 */
export const makeProperty = <V>(
  target: Entity.Unknown,
  annotation: Annotation.Annotation<Record<string, V>>,
  key: string,
): Atom.Atom<AnnotationSnapshot<V> | undefined> => {
  assertArgument(isEntity(target), 'target', 'Must be a reactive ECHO entity');
  return annotationPropertyFamily(target)(annotation)(key);
};
