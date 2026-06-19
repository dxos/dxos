//
// Copyright 2026 DXOS.org
//

import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';

import type * as Annotation from '../../Annotation';
import type * as Entity from '../../Entity';
import { getMetaChecked } from '../common/api/meta';
import { type Mutable, change } from '../common/proxy/reactive';
import { isEntity, isSnapshot } from '../Entity/guard';
import { getDictionary } from './dictionary';

/**
 * Get the value of an annotation from an entity instance or snapshot.
 *
 * The value is exposed as `Mutable<T>`: for a live entity the reactive proxy returns the stored value
 * directly (live Refs, mutable arrays), so it can be spliced/pushed in place inside an `Obj.update`
 * callback (the proxy enforces read-only access outside one). Snapshots return a decoded detached copy.
 */
export const get = <T>(
  target: Entity.Unknown | Entity.Snapshot,
  annotation: Annotation.Annotation<T>,
): Option.Option<Mutable<T>> => {
  if (isSnapshot(target)) {
    // Detached decoded copy; typed mutably for a uniform return shape.
    return getDictionary(getMetaChecked(target).annotations, annotation) as Option.Option<Mutable<T>>;
  }
  if (isEntity(target)) {
    const annotations = getMetaChecked(target).annotations;
    // The dictionary slot is typed `unknown`; at runtime it holds the annotation's live value
    // (the proxy codecs nested refs in both directions), so the read coerces to the mutable form.
    return annotation.key in annotations ? Option.some(annotations[annotation.key] as Mutable<T>) : Option.none();
  }
  throw new TypeError('Target is not an annotation target.');
};

/**
 * Set the value of an annotation on an entity instance.
 * Must be called with a mutable entity — i.e. inside an `Obj.update` callback.
 *
 * The value is assigned directly to the reactive meta dictionary; the proxy encodes nested Refs and
 * links their unsaved targets on write (matching ordinary property assignment), so no manual
 * encode/persist step is needed.
 */
export const set = <T>(target: Mutable<Entity.Unknown>, annotation: Annotation.Annotation<T>, value: T): void => {
  if (isEntity(target)) {
    // The dictionary slot is untyped, so the proxy can't validate against the annotation schema;
    // validate here (without encoding — the proxy encodes nested refs and links targets on assignment).
    Schema.validateSync(annotation.schema)(value);
    getMetaChecked(target).annotations[annotation.key] = value;
  } else {
    throw new TypeError('Target is not an annotation target.');
  }
};

/**
 * Mutate an existing annotation value in place via a callback, wrapping the mutation in a change
 * transaction (like `Obj.update`). Use when only an annotation needs to change. No-op when absent.
 */
export const update = <T>(
  target: Entity.Unknown,
  annotation: Annotation.Annotation<T>,
  mutator: (value: Mutable<T>) => void,
): void => {
  change(target, (mutable) => {
    const current = get(mutable, annotation);
    if (Option.isSome(current)) {
      mutator(current.value);
      // Validate against the annotation's own schema — the dictionary slot is untyped, so the proxy
      // can't. Schema validation checks ref structure only (not targets), so it is cycle-safe.
      Schema.validateSync(annotation.schema)(current.value);
    }
  });
};
