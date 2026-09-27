//
// Copyright 2026 DXOS.org
//

import { next as A } from '@automerge/automerge';

import { type Database, Filter, Migration, Obj, Ref } from '@dxos/echo';
import { DATA_NAMESPACE, EncodedReference } from '@dxos/echo-protocol';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { getDeep } from '@dxos/util';

import { getObjectCore } from '../echo-handler/index.ts';
import { isRecord } from './encoded-value.ts';
import { assignPatch, ensureByConvergenceKey } from './migration-context.ts';

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

/** Reads the RAW (still-live, automerge-backed) element at `property[index]`, for {@link A.getConflicts}. */
const getRawElement = (object: Obj.Unknown, property: string, index: number): unknown => {
  const core = getObjectCore(object);
  return getDeep(core.getDoc(), [...core.mountPath, DATA_NAMESPACE, property, index]);
};

/**
 * The step-2 gate's second half (M0-REPORT.md design item 5): `id` present is necessary but not
 * sufficient — two peers' concurrent stamps of the SAME blank leave a live register conflict that
 * `A.getConflicts` sees even after one value is presented, and splitting on it would silently pick a
 * side instead of waiting for the caller's explicit reconcile write.
 */
const hasUnresolvedIdConflict = (object: Obj.Unknown, property: string, index: number, elementId: string): boolean => {
  const rawElement = getRawElement(object, property, index);
  if (typeof rawElement !== 'object' || rawElement === null) {
    return false;
  }
  const conflicts = A.getConflicts(rawElement, elementId);
  return conflicts !== undefined && Object.keys(conflicts).length > 0;
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

  for (const object of objects) {
    if (Obj.getTypeURI(object)?.toString() !== migration.fromType.toString()) {
      continue; // The type query's index can lag an earlier run's own type switch.
    }

    const items: unknown = Obj.getValue(object, [migration.property]);
    if (!Array.isArray(items)) {
      continue;
    }

    const refs: Ref.Ref<Obj.Unknown>[] = [];
    let allResolved = true;
    for (let index = 0; index < items.length; index++) {
      const element: unknown = items[index];
      const elementIdValue: unknown = isRecord(element) ? element[migration.elementId] : undefined;

      if (typeof elementIdValue !== 'string') {
        skipped.push({ objectId: object.id, elementIndex: index });
        log.info('array fan-out: element has no stable id yet, skipping this object for now', {
          object: object.id,
          index,
        });
        allResolved = false;
        continue;
      }
      if (hasUnresolvedIdConflict(object, migration.property, index, migration.elementId)) {
        skipped.push({ objectId: object.id, elementIndex: index });
        log.info('array fan-out: element id has an unresolved conflict, skipping this object for now', {
          object: object.id,
          index,
        });
        allResolved = false;
        continue;
      }

      // The `continue` above already proves `element` is a record (it is the only way `elementIdValue`
      // could be a string), but a computed-key read does not narrow `element` itself for TypeScript, so
      // `toChild`'s argument is re-derived the same way rather than indexed unchecked.
      const elementRecord: Record<string, unknown> = isRecord(element) ? element : {};
      const convergenceKey = Migration.makeArrayFanOutConvergenceKey(
        migration.fromType.toString(),
        object.id,
        migration.childRole ?? migration.property,
        elementIdValue,
      );
      const childData: Record<string, unknown> = Object.fromEntries(Object.entries(migration.toChild(elementRecord)));
      const child = ensureByConvergenceKey(db, migration.child, convergenceKey, childData);
      refs.push(Ref.make(child));
    }

    // All-or-nothing: a partial migration would leave the object under a mix of `from`'s array and
    // `to`'s refs with no marker recording which elements are done — re-run once every element clears
    // the gate instead.
    if (!allResolved) {
      continue;
    }

    applyArrayFanOut(object, migration, refs);
  }

  return skipped;
};

/**
 * The one committing step for a fully-resolved array fan-out: writes the collected refs onto
 * `toProperty` and switches `object` to `migration.to`. Leaves `property` (the source array)
 * untouched — kept in place as a retired property, never folded forward: array fan-out relies on the
 * merge engine's convergence-key collapse for late writes, not the single-object fold-forward standing
 * rule (see {@link Migration.ArrayFanOutMigration}'s own doc comment). Two separate automerge changes,
 * not one — a crash between them leaves the refs written but the type still `from`; the next run finds
 * the object by `from` again, recomputes the (now-unchanged, guard-skipped) refs, and completes the
 * type switch, so the window is real but self-healing, per M0-REPORT.md design item 7.
 */
const applyArrayFanOut = (
  object: Obj.Unknown,
  migration: Migration.ArrayFanOutMigration,
  refs: Ref.Ref<Obj.Unknown>[],
): void => {
  assignPatch(
    object,
    { [migration.toProperty]: refs },
    `migration: array-fan-out ${migration.fromType.toString()} -> ${migration.toType.toString()}`,
  );
  getObjectCore(object).setType(EncodedReference.fromURI(migration.toType));
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
        }
      }
    });
  }
};
