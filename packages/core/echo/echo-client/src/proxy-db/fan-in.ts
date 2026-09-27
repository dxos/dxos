//
// Copyright 2026 DXOS.org
//

import { type Database, Filter, Migration, Obj } from '@dxos/echo';
import { log } from '@dxos/log';

import { getObjectCore } from '../echo-handler/index.ts';
import { assignPatch } from './migration-context.ts';

//
// Fan-in runner (`.agents/projects/lenses/IMPLEMENTATION-PLAN.md` Phase D; M0-REPORT.md design item
// 3): absorbs every live child into the parent `parentOf` names, resolving a property both sides
// define per the declared `collision` policy, then tombstones the child. Queried by type on every
// run rather than tracked, so a child created after an earlier run "completed" — the late-child case
// design item 3 calls out — is absorbed the next time this runs, with no separate detection pass.
//

/**
 * Per-key collision resolution: `parentValue`/`childValue` disagree AND `parentValue` is not the
 * absent/never-written case (handled by the caller before this runs) — the genuine clash `collision`
 * exists to resolve deterministically instead of leaving it to automerge's actor-id-randomized LWW.
 */
const resolveCollision = (
  collision: Migration.CollisionPolicy,
  parentValue: unknown,
  childValue: unknown,
  key: string,
): unknown => {
  if (collision === 'parent-wins') {
    return parentValue;
  }
  if (collision === 'child-wins') {
    return childValue;
  }
  return collision(parentValue, childValue, key);
};

/**
 * Resolves `patch` (one child's proposed absorption) against `parent`'s CURRENT values: a key the
 * parent has never set (or already agrees with) is absorbed outright; a key the parent already holds
 * a DIFFERENT value for — its own direct edit, or an earlier child absorbed in this same run — is a
 * genuine collision, resolved by `collision`.
 */
const resolvePatch = (
  parent: Obj.Unknown,
  patch: Record<string, unknown>,
  collision: Migration.CollisionPolicy,
): Record<string, unknown> => {
  const resolved: Record<string, unknown> = {};
  for (const [key, childValue] of Object.entries(patch)) {
    const parentValue: unknown = Obj.getValue(parent, [key]);
    resolved[key] =
      parentValue === undefined || parentValue === childValue
        ? childValue
        : resolveCollision(collision, parentValue, childValue, key);
  }
  return resolved;
};

/**
 * Runs one {@link Migration.FanInMigration}: see the module doc comment. Never throws for one
 * unresolvable child (no parent yet) — it is logged and left for the next run, so a batch containing
 * several fan-ins never aborts on the first one that is not ready.
 */
export const runFanInMigration = async (db: Database.Database, migration: Migration.FanInMigration): Promise<void> => {
  // `Filter.type` on a bare URI (rather than a schema class) resolves to `Filter<any>`, so the
  // result is annotated explicitly here rather than left to infer `any`.
  const children: Obj.Unknown[] = await db.query(Filter.type(migration.fromType)).run();
  for (const child of children) {
    // The type query reads the index, which can still list a child an earlier run already absorbed
    // and tombstoned; `isDeleted` is the live authority, so a re-run never double-absorbs.
    if (getObjectCore(child).isDeleted()) {
      continue;
    }

    const parentRef = migration.parentOf(child);
    if (!parentRef) {
      log.info('fan-in: child has no resolvable parent yet, skipping', { child: child.id });
      continue;
    }
    const parent = await parentRef.load();

    const patch = migration.absorb(parent, child);
    const resolved = resolvePatch(parent, patch, migration.collision);
    assignPatch(parent, resolved, `migration: fan-in ${migration.fromType.toString()}`);

    db.remove(child);
  }
};
