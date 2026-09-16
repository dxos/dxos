//
// Copyright 2026 DXOS.org
//

import type * as Option from 'effect/Option';
import type * as Atom from 'effect/unstable/reactivity/Atom';

import { assertArgument } from '@dxos/invariant';

import type * as Annotation from '../../Annotation.ts';
import type * as Entity from '../../Entity.ts';
import { getEntityAtoms } from '../Entity/atoms.ts';
import { isEntity } from '../Entity/index.ts';

/**
 * Reactive atom for an annotation value on an entity instance. Emits a shallow snapshot (a fresh
 * reference for objects/arrays) so dependent atoms recompute on change. Mirrors `Obj.atomProperty`.
 */
export const makeAtom = <T>(
  target: Entity.Unknown,
  annotation: Annotation.Annotation<T>,
): Atom.Atom<Option.Option<T>> => {
  assertArgument(isEntity(target), 'target', 'Must be a reactive ECHO entity');
  return getEntityAtoms(target).annotation(annotation);
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
  return getEntityAtoms(target).annotationProperty(annotation, key);
};
