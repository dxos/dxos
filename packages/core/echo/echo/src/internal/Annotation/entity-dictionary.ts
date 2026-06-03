//
// Copyright 2026 DXOS.org
//

import * as Option from 'effect/Option';

import type * as Annotation from '../../Annotation';
import type * as Entity from '../../Entity';
import { getMetaChecked } from '../common/api/meta';
import { type Mutable } from '../common/proxy/reactive';
import { isEntity, isSnapshot } from '../Entity/guard';
import { getDictionary, setDictionary } from './dictionary';

/**
 * Get the value of an annotation from an entity instance or snapshot.
 */
export const get = <T>(
  target: Entity.Unknown | Entity.Snapshot,
  annotation: Annotation.Annotation<T>,
): Option.Option<T> => {
  if (isEntity(target) || isSnapshot(target)) {
    const meta = getMetaChecked(target);
    return getDictionary(meta.annotations, annotation);
  } else {
    throw new TypeError('Target is not an annotation target.');
  }
};

/**
 * Set the value of an annotation on an entity instance.
 * Must be called with a mutable entity — i.e. inside an `Obj.update` callback.
 */
export const set = <T>(target: Mutable<Entity.Unknown>, annotation: Annotation.Annotation<T>, value: T): void => {
  if (isEntity(target)) {
    const meta = getMetaChecked(target);
    setDictionary(meta.annotations, annotation, value);
  } else {
    throw new TypeError('Target is not an annotation target.');
  }
};
