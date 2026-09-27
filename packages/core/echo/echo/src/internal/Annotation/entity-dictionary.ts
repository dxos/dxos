//
// Copyright 2026 DXOS.org
//

import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';

import type * as Annotation from '../../Annotation.ts';
import type * as Entity from '../../Entity.ts';
import { getDeviceState } from '../common/api/device-state.ts';
import { getMetaChecked } from '../common/api/meta.ts';
import { type Mutable, change } from '../common/proxy/reactive.ts';
import { type EntityDeviceState } from '../common/types/index.ts';
import { isEntity, isSnapshot } from '../Entity/guard.ts';

const getDeviceStateChecked = <T>(target: unknown, annotation: Annotation.Annotation<T>): EntityDeviceState => {
  const state = getDeviceState(target);
  if (!state) {
    throw new TypeError(
      `Annotation ${annotation.key} is device-scoped and the target cannot hold device-scoped values.`,
    );
  }
  return state;
};

/** Reads a device-scoped value, stored in its encoded (JSON) form. */
const getDeviceValue = <T>(target: unknown, annotation: Annotation.Annotation<T>): Option.Option<T> => {
  const values = getDeviceState(target)?.getAnnotations();
  return values !== undefined && annotation.key in values
    ? Option.some(Schema.decodeUnknownSync(annotation.schema)(values[annotation.key]))
    : Option.none();
};

/**
 * Get the value of an annotation from an entity instance or snapshot.
 *
 * The value is read-only (schema types are readonly by default). To mutate it, use {@link update}
 * (which reads it as mutable inside a change transaction); the reactive proxy rejects mutation of the
 * live value outside an `Obj.update`. Snapshots return a detached copy.
 */
export const get = <T>(
  target: Entity.Unknown | Entity.Snapshot,
  annotation: Annotation.Annotation<T>,
): Option.Option<T> => {
  if (!isEntity(target) && !isSnapshot(target)) {
    throw new TypeError('Target is not an annotation target.');
  }
  // A snapshot copies the document, which never holds device-scoped values.
  if (annotation.storage === 'device') {
    return getDeviceValue(target, annotation);
  }

  // The dictionary slot is typed `unknown`; at runtime it holds the annotation's decoded value (the
  // proxy codecs nested refs in both directions, and a snapshot deep-copies what the proxy yields),
  // so the read coerces to the declared type rather than decoding a second time.
  const annotations = getMetaChecked(target).annotations;
  return annotation.key in annotations ? Option.some(annotations[annotation.key] as T) : Option.none();
};

/**
 * Set the value of an annotation on an entity instance.
 * Must be called with a mutable entity — i.e. inside an `Obj.update` callback.
 * A device-scoped value is written to the device's store immediately and is not undone if the
 * surrounding update fails.
 *
 * The value is assigned directly to the reactive meta dictionary; the proxy encodes nested Refs and
 * links their unsaved targets on write (matching ordinary property assignment), so no manual
 * encode/persist step is needed.
 */
export const set = <T>(target: Mutable<Entity.Unknown>, annotation: Annotation.Annotation<T>, value: T): void => {
  if (isEntity(target) && annotation.storage === 'device') {
    // Written to the device's store at once rather than to the document, so it joins no transaction.
    getDeviceStateChecked(target, annotation).setAnnotation(
      annotation.key,
      Schema.encodeSync(annotation.schema)(value),
    );
  } else if (isEntity(target)) {
    // The dictionary slot is untyped, so the proxy can't validate against the annotation schema;
    // validate here (without encoding — the proxy encodes nested refs and links targets on assignment).
    Schema.decodeSync(Schema.toType(annotation.schema))(value);
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
  if (annotation.storage === 'device') {
    const state = getDeviceStateChecked(target, annotation);
    const current = getDeviceValue(target, annotation);
    if (Option.isSome(current)) {
      // Decoded afresh on every read, so the value is a private copy the mutator may change.
      const value = current.value;
      mutator(value as Mutable<T>);
      state.setAnnotation(annotation.key, Schema.encodeSync(annotation.schema)(value));
    }
    return;
  }
  change(target, (mutable) => {
    const current = get(mutable, annotation);
    if (Option.isSome(current)) {
      // `get` returns the value read-only; inside this change transaction the live value is mutable.
      const value = current.value as Mutable<T>;
      mutator(value);
      // Validate against the annotation's own schema — the dictionary slot is untyped, so the proxy
      // can't. Schema validation checks ref structure only (not targets), so it is cycle-safe.
      Schema.decodeUnknownSync(Schema.toType(annotation.schema))(value);
    }
  });
};
