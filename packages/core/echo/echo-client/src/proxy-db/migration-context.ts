//
// Copyright 2026 DXOS.org
//

import { Database, Filter, Migration, Obj, Ref, Type } from '@dxos/echo';
import { DATA_NAMESPACE } from '@dxos/echo-protocol';
import { setDeep } from '@dxos/util';

import { getObjectCore } from '../echo-handler/index.ts';
import { computeGuardedDataWrites } from './encoded-value.ts';

//
// Phase D (`.agents/projects/lenses/IMPLEMENTATION-PLAN.md`; M0-REPORT.md design items 2, 3, 4):
// the `ensure`/`assign` primitives a migration `transform` uses for fan-out (create-by-meta-key) and
// cross-object writes. Effects happen synchronously during `transform`, so a crash mid-object leaves
// the source under its old type (the next `runMigrations` pass re-executes `transform` from scratch)
// and both primitives are idempotent by construction — `ensure` finds what an earlier attempt already
// created, `assign` never rewrites an already-equal value.
//

/**
 * Finds the object of `type` whose `meta.convergenceKey` equals `convergenceKey` — checked over the
 * local working set (`runSync`), never an async round trip, and never a `Filter` on the key itself
 * (there is none) — or creates one with a random id and that key. Reused directly by the fan-in and
 * array-fan-out runners, which call it without going through a `transform`'s
 * {@link Migration.ObjectMigrationContext}.
 */
export const ensureByConvergenceKey = (
  db: Database.Database,
  type: Type.AnyObj,
  convergenceKey: string,
  data: Record<string, unknown>,
): Obj.Unknown => {
  const existing = db
    .query(Filter.type(type))
    .runSync()
    .find((candidate) => Obj.getMeta(candidate).convergenceKey === convergenceKey);
  if (existing) {
    return existing;
  }
  return db.add(Obj.make(type, { ...data, [Obj.Meta]: { convergenceKey } }));
};

/**
 * Applies a value-compare-guarded patch to `target`'s own data, in one automerge change on its own
 * `ObjectCore`. Returns whether it actually wrote anything, for callers (fan-in) that fold several
 * candidates' patches into one resolved write.
 */
export const assignPatch = (target: Obj.Unknown, patch: Record<string, unknown>, message: string): boolean => {
  const core = getObjectCore(target);
  const writes = computeGuardedDataWrites(core, patch);
  if (writes.size === 0) {
    return false;
  }
  const mountPath = core.mountPath;
  core.change(
    (doc) => {
      for (const [key, value] of writes) {
        setDeep(doc, [...mountPath, DATA_NAMESPACE, key], value);
      }
    },
    { message },
  );
  return true;
};

/**
 * `Database.add`'s own generic guard (`RejectTypeEntity<T>`) is a conditional type that TypeScript
 * resolves only against a type parameter's OWN bare identity, never against a type built from it
 * (`OfShape<InstanceType<To>>`, as `ensure` below constructs) — so calling `db.add` directly under a
 * caller's naked generic `To` does not type-check. Concrete-typed here, `Obj.Unknown` is not itself a
 * `Type`-kind entity, so the guard resolves; `db.add` returns the SAME instance it was given (see
 * `DatabaseImpl#_addObject`), so registering it this way and keeping the caller's own already
 * precisely-typed reference afterwards is sound, not a cast at the erasure boundary. Re-querying to
 * recover a typed reference instead — the first approach tried — is NOT an option: a query's `runSync`
 * cache does not see an object added in the same synchronous tick.
 */
const addObject = (db: Database.Database, object: Obj.Unknown): void => {
  db.add(object);
};

/**
 * Builds the `ensure`/`assign` pair {@link Migration.ObjectMigrationContext} exposes to a migration's
 * `transform`. `ensure`'s find branch and create branch are both written here (not delegated to
 * {@link ensureByConvergenceKey}, which fan-in and array-fan-out use) so the query and the creation
 * both run under the caller's own generic `To` — abstract here, inside a property implementing a
 * generic interface method — letting the returned `Ref` carry `Type.InstanceType<To>` rather than the
 * widened `Obj.Unknown` those two callers get.
 */
export const createObjectMigrationContext = (db: Database.Database): Migration.ObjectMigrationContext => ({
  db,
  ensure: (type, convergenceKey, data) => {
    const existing = db
      .query(Filter.type(type))
      .runSync()
      .find((candidate) => Obj.getMeta(candidate).convergenceKey === convergenceKey);
    if (existing) {
      return Ref.make(existing);
    }
    const created = Obj.make(type, { ...data, [Obj.Meta]: { convergenceKey } });
    addObject(db, created);
    return Ref.make(created);
  },
  assign: (target, patch) => {
    const patchRecord: Record<string, unknown> = Object.fromEntries(Object.entries(patch));
    assignPatch(target, patchRecord, 'migration: assign');
  },
});
