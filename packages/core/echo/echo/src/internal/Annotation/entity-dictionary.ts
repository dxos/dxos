//
// Copyright 2026 DXOS.org
//

import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';

import type * as Annotation from '../../Annotation.ts';
import type * as Entity from '../../Entity.ts';
import { getMetaChecked } from '../common/api/meta.ts';
import { type Mutable, change } from '../common/proxy/reactive.ts';
import { isEntity, isSnapshot } from '../Entity/guard.ts';

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

  // The dictionary slot is typed `unknown`; at runtime it holds the annotation's decoded value (the
  // proxy codecs nested refs in both directions, and a snapshot deep-copies what the proxy yields),
  // so the read coerces to the declared type rather than decoding a second time.
  const annotations = getMetaChecked(target).annotations;
  if (annotation.keyed) {
    const entries = getEntries(annotations, annotation);
    return Object.keys(entries).length > 0 ? Option.some(entries as T) : Option.none();
  }

  return annotation.key in annotations ? Option.some(annotations[annotation.key] as T) : Option.none();
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
    Schema.decodeSync(Schema.toType(annotation.schema))(value);
    const annotations = getMetaChecked(target).annotations;
    if (annotation.keyed) {
      writeEntries(annotations, annotation, getEntries(annotations, annotation), value as Entries);
    } else {
      annotations[annotation.key] = value;
    }
  } else {
    throw new TypeError('Target is not an annotation target.');
  }
};

/**
 * Mutate an existing annotation value in place via a callback, wrapping the mutation in a change
 * transaction (like `Obj.update`). Use when only an annotation needs to change. No-op when absent,
 * except for a keyed annotation, whose mutator starts from an empty record.
 */
export const update = <T>(
  target: Entity.Unknown,
  annotation: Annotation.Annotation<T>,
  mutator: (value: Mutable<T>) => void,
): void => {
  change(target, (mutable) => {
    if (annotation.keyed) {
      const annotations = getMetaChecked(mutable).annotations;
      const before = getEntries(annotations, annotation);
      // Values are the live entries, so a nested edit lands in place; only added, replaced, or
      // removed keys are written back.
      const after = { ...before };
      mutator(after as Mutable<T>);
      Schema.decodeUnknownSync(Schema.toType(annotation.schema))(after);
      writeEntries(annotations, annotation, before, after);
      return;
    }

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

type Entries = Record<string, unknown>;

const entryKey = (annotation: Annotation.Annotation<any>, key: string): string => `${annotation.key}/${key}`;

/**
 * Entries of a keyed annotation: a whole record written under its bare key (by a non-keyed
 * annotation with the same id), overridden by the per-entry keys.
 */
const getEntries = (annotations: Readonly<Entries>, annotation: Annotation.Annotation<any>): Entries => {
  const entries: Entries = {};
  const record = annotations[annotation.key];
  if (record !== null && typeof record === 'object') {
    Object.assign(entries, record);
  }

  const prefix = entryKey(annotation, '');
  for (const key of Object.keys(annotations)) {
    if (key.startsWith(prefix)) {
      entries[key.slice(prefix.length)] = annotations[key];
    }
  }

  return entries;
};

/**
 * Writes each added or replaced entry under its own key and deletes removed ones, never assigning a
 * container, so concurrent writes of different entries merge. A removed entry is also deleted from
 * the bare-key record, which stays in place for clients that still write it.
 */
const writeEntries = (
  annotations: Entries,
  annotation: Annotation.Annotation<any>,
  before: Readonly<Entries>,
  after: Readonly<Entries>,
): void => {
  for (const [key, value] of Object.entries(after)) {
    if (before[key] !== value) {
      annotations[entryKey(annotation, key)] = value;
    }
  }

  for (const key of Object.keys(before)) {
    if (key in after) {
      continue;
    }

    delete annotations[entryKey(annotation, key)];
    const record = annotations[annotation.key];
    if (record !== null && typeof record === 'object' && key in record) {
      delete (record as Entries)[key];
    }
  }
};
