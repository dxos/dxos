//
// Copyright 2026 DXOS.org
//

import { next as A, type Heads } from '@automerge/automerge';
import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';

import { Annotation, type Database, Filter, Migration, Obj, Ref } from '@dxos/echo';
import { DATA_NAMESPACE, EncodedReference } from '@dxos/echo-protocol';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { getDeep, setDeep } from '@dxos/util';

import { META_NAMESPACE, SYSTEM_NAMESPACE } from '../core-db/index.ts';
import { getObjectCore } from '../echo-handler/index.ts';
import { computeGuardedDataWrites, getDecodedDataWithRefs, isRecord } from './encoded-value.ts';
import { type ConvergenceKeyCache, ensureByConvergenceKey } from './migration-context.ts';

//
// Array fan-out + id-stamping runners (`.agents/projects/lenses/IMPLEMENTATION-PLAN.md` Phase D;
// M0-REPORT.md design item 5). Stamping (`runStampElementIdsMigration`) is a standing presence-guard
// over a live array, edited through the reactive proxy element-by-element so each stamp is its own
// minimal automerge op — never a whole-array replace, which would clobber a concurrent peer's edit to
// an untouched element. The split (`runArrayFanOutMigration`) is all-or-nothing per parent object: an
// object with any element that fails the gate (no id yet, or an unresolved id conflict) is left
// entirely alone this pass, so the eventual full migration is one minimal write, not a half-applied
// one; `ensure`'s idempotence is what makes the next pass safe to retry.
//

/** The message of an array fan-out's split change, also recorded as its marker's `migration`. */
export const arrayFanOutSplitMessage = (migration: Migration.ArrayFanOutMigration): string =>
  `migration: array-fan-out ${migration.fromType.toString()} -> ${migration.toType.toString()}`;

/** Reads the RAW (still-live, automerge-backed) element at `property[index]`, for {@link A.getConflicts}. */
const getRawElement = (object: Obj.Unknown, property: string, index: number): unknown => {
  const core = getObjectCore(object);
  return getDeep(core.getDoc(), [...core.mountPath, DATA_NAMESPACE, property, index]);
};

/**
 * Whether the element's id register holds concurrent stamps that DISAGREE: splitting then would
 * silently pick a side. Equal-valued leftovers (peers re-asserting the same id) are agreement.
 */
export const hasUnresolvedIdConflict = (
  object: Obj.Unknown,
  property: string,
  index: number,
  elementId: string,
): boolean => {
  const rawElement = getRawElement(object, property, index);
  if (typeof rawElement !== 'object' || rawElement === null) {
    return false;
  }
  const conflicts = A.getConflicts(rawElement, elementId);
  return conflicts !== undefined && new Set(Object.values(conflicts).map(String)).size > 1;
};

/**
 * Runs one {@link Migration.ArrayFanOutMigration}. Logs (never throws) every skipped element, and
 * returns the skipped `{ objectId, elementIndex }` pairs so a caller (a test, a future doctor command)
 * can inspect what is still pending without re-deriving it.
 */
export const runArrayFanOutMigration = async (
  db: Database.Database,
  migration: Migration.ArrayFanOutMigration,
): Promise<ReadonlyArray<{ objectId: string; elementIndex: number }>> => {
  const objects: Obj.Unknown[] = await db.query(Filter.type(migration.from)).run();
  const skipped: { objectId: string; elementIndex: number }[] = [];
  // Shared across every `ensureByConvergenceKey` call in this pass (all against `migration.child`), so
  // N elements across every matched parent cost one durable query, not N — see `ConvergenceKeyCache`.
  const childCache: ConvergenceKeyCache = new Map();

  for (const object of objects) {
    if (Obj.getTypeURI(object)?.toString() !== migration.fromType.toString()) {
      continue; // The type query's index can lag an earlier run's own type switch.
    }
    // A fan-out whose `from` and `to` are the same type is recognised as done by its marker.
    const markers = Annotation.get(object, Migration.ArrayFanOutMarkerAnnotation);
    if (Option.isSome(markers) && markers.value[migration.property]?.migration === arrayFanOutSplitMessage(migration)) {
      continue;
    }

    // The split is written at these heads, so an element edit replicated in while children are
    // ensured is concurrent with it and folded forward.
    const core = getObjectCore(object);
    const readHeads = core.getHeads();
    const items: unknown = getDecodedDataWithRefs(db, core, readHeads)[migration.property];
    if (!Array.isArray(items)) {
      continue;
    }

    // Every element is gated before any child is created, so a skipped object leaves nothing behind.
    const elements: { elementId: string; element: Record<string, unknown>; index: number }[] = [];
    for (let index = 0; index < items.length; index++) {
      const element: unknown = items[index];
      const elementIdValue: unknown = isRecord(element) ? element[migration.elementId] : undefined;
      if (!isRecord(element) || typeof elementIdValue !== 'string') {
        skipped.push({ objectId: object.id, elementIndex: index });
        log.info('array fan-out: element has no stable id yet, skipping this object for now', {
          object: object.id,
          index,
        });
        continue;
      }
      if (hasUnresolvedIdConflict(object, migration.property, index, migration.elementId)) {
        skipped.push({ objectId: object.id, elementIndex: index });
        log.info('array fan-out: element id has an unresolved conflict, skipping this object for now', {
          object: object.id,
          index,
        });
        continue;
      }
      elements.push({ elementId: elementIdValue, element, index });
    }
    if (elements.length !== items.length) {
      continue;
    }
    // Two elements sharing an id (a concurrent move leaves a copy) would collapse into one child.
    if (new Set(elements.map(({ elementId }) => elementId)).size !== elements.length) {
      skipped.push({ objectId: object.id, elementIndex: -1 });
      log.info('array fan-out: elements share an id, skipping this object for now', { object: object.id });
      continue;
    }

    const refs: Record<string, Ref.Ref<Obj.Unknown>> = {};
    for (const { elementId, element, index } of elements) {
      const convergenceKey = Migration.makeArrayFanOutConvergenceKey(
        migration.fromType.toString(),
        object.id,
        migration.childRole ?? migration.property,
        elementId,
      );
      const child = await ensureByConvergenceKey(
        db,
        migration.child,
        convergenceKey,
        migration.toChild(element, index),
        childCache,
      );
      refs[elementId] = Ref.make(child);
    }

    applyArrayFanOut(object, migration, refs, readHeads);
  }

  return skipped;
};

/**
 * The one committing step for a fully-resolved array fan-out: in a SINGLE automerge change, writes the
 * collected refs onto `toProperty`, switches `object` to `migration.to`, and records this property's
 * own {@link Migration.ArrayFanOutMarker} — naming this very change (by `message` + `preHeads`) so a
 * fold-forward pass can find it later — under its OWN key of {@link Migration.ArrayFanOutMarkerAnnotation}
 * (never a whole-annotation replace), so splitting a second array property on the same parent never
 * disturbs the first property's marker. One change, not two: a crash can never leave the refs written
 * without the marker a fold-forward pass needs, or the type switched without the refs. Leaves
 * `property` (the source array) untouched — kept in place as a retired property; a late write to it
 * after this split is not lost, but folded forward by {@link foldArrayFanOutMigration} in
 * `fold-forward.ts` (M0-REPORT.md design item 5's residual, closed by the "Limit fixes" item 4).
 */
const applyArrayFanOut = (
  object: Obj.Unknown,
  migration: Migration.ArrayFanOutMigration,
  refs: Record<string, Ref.Ref<Obj.Unknown>>,
  preHeads: Heads,
): void => {
  const core = getObjectCore(object);
  const mountPath = core.mountPath;
  const message = arrayFanOutSplitMessage(migration);

  const dataWrites = computeGuardedDataWrites(core, { [migration.toProperty]: refs });
  const typeRef = EncodedReference.fromURI(migration.toType);
  const marker = core.encode(
    Schema.encodeSync(Migration.ArrayFanOutMarkerSchema)({
      migration: message,
      preHeads: [...preHeads],
      property: migration.property,
      elementId: migration.elementId,
    }),
  );

  core.changeAt(
    preHeads,
    (doc) => {
      for (const [key, value] of dataWrites) {
        setDeep(doc, [...mountPath, DATA_NAMESPACE, key], value);
      }
      setDeep(doc, [...mountPath, SYSTEM_NAMESPACE, 'type'], typeRef);
      setDeep(
        doc,
        [...mountPath, META_NAMESPACE, 'annotations', Migration.ArrayFanOutMarkerAnnotation.key, migration.property],
        marker,
      );
    },
    { message },
  );
};

/**
 * Runs one {@link Migration.StampElementIdsMigration}: `element[elementId] ??= randomId()` for every
 * element of `property` that lacks one, one guarded write per element through the reactive proxy so a
 * concurrent peer's edit to an untouched element is never clobbered.
 */
export const runStampElementIdsMigration = async (
  db: Database.Database,
  migration: Migration.StampElementIdsMigration,
): Promise<void> => {
  const objects: Obj.Unknown[] = await db.query(Filter.type(migration.entityType)).run();
  for (const object of objects) {
    Obj.update(object, (object) => {
      const items: unknown = Obj.getValue(object, [migration.property]);
      if (!Array.isArray(items)) {
        return;
      }
      for (let index = 0; index < items.length; index++) {
        const existing: unknown = Obj.getValue(object, [migration.property, index, migration.elementId]);
        if (existing === undefined) {
          Obj.setValue(object, [migration.property, index, migration.elementId], PublicKey.random().toHex());
        } else if (hasUnresolvedIdConflict(object, migration.property, index, migration.elementId)) {
          // Re-asserting the presented id supersedes the raced stamps; peers doing so concurrently agree.
          Obj.setValue(object, [migration.property, index, migration.elementId], existing);
        }
      }
    });
  }
};
