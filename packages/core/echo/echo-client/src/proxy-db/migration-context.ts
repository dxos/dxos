//
// Copyright 2026 DXOS.org
//

import { Database, Filter, Migration, Obj, Query, Ref, Type } from '@dxos/echo';
import { DATA_NAMESPACE } from '@dxos/echo-protocol';
import { setDeep } from '@dxos/util';

import { getObjectCore } from '../echo-handler/index.ts';
import { computeGuardedDataWrites } from './encoded-value.ts';

//
// The `ensure`/`assign` primitives `onMigration` uses for fan-out and cross-object writes. Both are
// idempotent, since a resumed `onMigration` repeats them: `ensure` finds what an earlier attempt created
// (durably, so a child from an earlier session or before a reload is found), `assign` never rewrites an
// equal value.
//

/**
 * Convergence-key -> object index for one `type`, built once per runner pass by
 * {@link findByConvergenceKey}/{@link ensureByConvergenceKey} the first time either sees that `type`
 * for a given cache, and reused (never re-queried) for every following lookup or creation against the
 * same cache and `type` — so N elements of one array (or N objects of one migration) cost one durable
 * query per type, not N. Share one cache across every `ensure`/`find` call in a single runner pass;
 * never reuse a cache across two separate passes, since a `type` already indexed here would then hide
 * an object another peer (or an earlier step of the SAME pass) has since created.
 */
export type ConvergenceKeyCache = Map<Type.AnyObj, Map<string, Obj.Unknown>>;

/**
 * Every object of `type` carrying a convergence key, tombstones included: a child the user deleted
 * must be found, or `ensure` would recreate it. A merged-away duplicate is skipped, its survivor is
 * live, and a live object is preferred over a deleted one with the same key.
 */
const queryConvergenceKeyIndex = async (
  db: Database.Database,
  type: Type.AnyObj,
): Promise<Map<string, Obj.Unknown>> => {
  const index = new Map<string, Obj.Unknown>();
  const candidates = await db.query(Query.select(Filter.type(type)).options({ deleted: 'include' })).run();
  for (const candidate of candidates) {
    const key = Obj.getMeta(candidate).convergenceKey;
    const core = getObjectCore(candidate);
    if (!key || core.getMergedInto() !== undefined) {
      continue;
    }
    const existing = index.get(key);
    if (!existing || (getObjectCore(existing).isDeleted() && !core.isDeleted())) {
      index.set(key, candidate);
    }
  }
  return index;
};

/** The `type`'s index within `cache`, durably queried (`run()`, not `runSync()`) the first time it is asked for. */
const loadConvergenceKeyIndex = async (
  db: Database.Database,
  type: Type.AnyObj,
  cache: ConvergenceKeyCache,
): Promise<Map<string, Obj.Unknown>> => {
  const existingIndex = cache.get(type);
  if (existingIndex) {
    return existingIndex;
  }
  const index = await queryConvergenceKeyIndex(db, type);
  cache.set(type, index);
  return index;
};

/**
 * Finds the object of `type` whose `meta.convergenceKey` equals `convergenceKey` — a durable query
 * (there is no `Filter` on the key itself, so every candidate of `type` is read and matched), which
 * may return a deleted object. `undefined` when no such object exists yet. Shared by {@link ensureByConvergenceKey} and the
 * array-fan-out fold-forward pass (`fold-forward.ts`), which must tell "child already exists, fold into
 * it" from "child missing, create it" apart before deciding what to write. Pass `cache` to fold several
 * calls against the same `type` into one query (see {@link ConvergenceKeyCache}).
 */
export const findByConvergenceKey = async (
  db: Database.Database,
  type: Type.AnyObj,
  convergenceKey: string,
  cache?: ConvergenceKeyCache,
): Promise<Obj.Unknown | undefined> => {
  if (cache) {
    return (await loadConvergenceKeyIndex(db, type, cache)).get(convergenceKey);
  }
  return (await queryConvergenceKeyIndex(db, type)).get(convergenceKey);
};

/**
 * Finds the object of `type` whose `meta.convergenceKey` equals `convergenceKey`, or creates one with
 * a random id and that key. Reused directly by the fan-in and array-fan-out runners, which call it
 * without going through a `transform`'s {@link Migration.ObjectMigrationContext}. A newly created
 * object is recorded straight into `cache` (never re-queried for it — the "local creation path" a
 * durable find alone cannot skip) so a later call in the same pass finds it without another query.
 */
export const ensureByConvergenceKey = async (
  db: Database.Database,
  type: Type.AnyObj,
  convergenceKey: string,
  data: Record<string, unknown>,
  cache?: ConvergenceKeyCache,
): Promise<Obj.Unknown> => {
  const existing = await findByConvergenceKey(db, type, convergenceKey, cache);
  if (existing) {
    return existing;
  }
  const created = db.add(Obj.make(type, { ...data, [Obj.Meta]: { convergenceKey } }));
  if (cache) {
    (await loadConvergenceKeyIndex(db, type, cache)).set(convergenceKey, created);
  }
  return created;
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
 * The {@link Migration.ObjectMigrationContext} `onMigration` receives. `ensure` queries under the
 * caller's own `To` so the returned `Ref` keeps its type, and is uncached since it runs once per object.
 */
export const createObjectMigrationContext = (db: Database.Database): Migration.ObjectMigrationContext => ({
  db,
  ensure: async (type, convergenceKey, data) => {
    // Tombstones included, so a child the user deleted is not recreated; a live match wins.
    const matches = (await db.query(Query.select(Filter.type(type)).options({ deleted: 'include' })).run()).filter(
      (candidate) =>
        Obj.getMeta(candidate).convergenceKey === convergenceKey &&
        getObjectCore(candidate).getMergedInto() === undefined,
    );
    const existing = matches.find((candidate) => !getObjectCore(candidate).isDeleted()) ?? matches[0];
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
