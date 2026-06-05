//
// Copyright 2026 DXOS.org
//

import * as Option from 'effect/Option';

import { deepMapValues } from '@dxos/util';

import type * as Annotation from '../../Annotation';
import type * as Entity from '../../Entity';
import { getMetaChecked } from '../common/api/meta';
import { type Mutable } from '../common/proxy/reactive';
import { getDatabase } from '../Entity/api';
import { isEntity, isSnapshot } from '../Entity/guard';
import { Ref, getRefSavedTarget } from '../Ref';
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
    // Persist any unsaved Ref targets in the value into the entity's database so
    // the encoded DXN resolves on read. This mirrors normal property assignment,
    // where the reactive proxy links unsaved ref targets via `createRef` →
    // `database.add`. `setDictionary` pre-encodes the value (`Schema.encodeSync`),
    // so the live Ref never reaches the proxy's link handling and would otherwise
    // be stored as a dangling reference.
    persistRefTargets(target, value);
    setDictionary(meta.annotations, annotation, value);
  } else {
    throw new TypeError('Target is not an annotation target.');
  }
};

/**
 * Add any unsaved Ref targets found in `value` to the host entity's database, matching the
 * auto-persistence applied to refs assigned to ordinary entity properties. Refs whose target
 * already lives in a database (the host's or a foreign one) are left untouched.
 */
const persistRefTargets = (host: Entity.Unknown, value: unknown): void => {
  const database = getDatabase(host);
  if (database == null) {
    return;
  }

  deepMapValues(value, (current, recurse) => {
    if (Ref.isRef(current)) {
      const refTarget = getRefSavedTarget(current);
      if (refTarget != null && isEntity(refTarget) && getDatabase(refTarget) == null) {
        database.add(refTarget);
      }
      return current;
    }
    return recurse(current);
  });
};
