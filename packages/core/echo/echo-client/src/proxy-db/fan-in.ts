//
// Copyright 2026 DXOS.org
//

import { type Heads } from '@automerge/automerge';
import * as Schema from 'effect/Schema';

import { type Database, Filter, Migration, Obj } from '@dxos/echo';
import { encodedValuesEqual } from '@dxos/echo-host/versions';
import { DATA_NAMESPACE, EncodedReference } from '@dxos/echo-protocol';
import { log } from '@dxos/log';
import { setDeep } from '@dxos/util';

import { META_NAMESPACE, type ObjectCore, SYSTEM_NAMESPACE } from '../core-db/index.ts';
import { getObjectCore } from '../echo-handler/index.ts';
import { getDecodedDataWithRefs, mapRefsToEncodedReferences } from './encoded-value.ts';
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
 * Message stamped on a child's absorb change (tombstone + type switch + {@link Migration.FanInMarker})
 * and stored verbatim as that marker's own `migration` field, so a fold-forward pass locates the exact
 * change by `message` + `deps` — see {@link Migration.FanInMarkerSchema}'s doc comment.
 */
export const fanInAbsorbMessage = (fanInId: string, parentId: string): string => `fan-in: ${fanInId} -> ${parentId}`;

/** {@link resolvePatch}'s result: the resolved values, plus which keys came from the child. */
export type ResolvedPatch = {
  values: Record<string, unknown>;
  /**
   * Keys whose resolved value came FROM THE CHILD: the parent had no value yet, already held the
   * child's value, or `collision` picked the child's value over a competing parent value. Excludes a
   * key the parent's own value won (see {@link Migration.FanInMarkerSchema}'s `fromChild` field).
   */
  fromChild: readonly string[];
};

/** `value` as `core` would store it, for comparing against the raw document. */
const encodeValue = (core: ObjectCore, value: unknown): unknown =>
  core.encode(mapRefsToEncodedReferences({ value }).value);

/**
 * Resolves `patch` (one child's proposed absorption) against `parent`'s CURRENT values: a key the
 * parent has never set (or already agrees with) is absorbed outright; a key the parent already holds
 * a DIFFERENT value for — its own direct edit, or an earlier child absorbed in this same run — is a
 * genuine collision, resolved by `collision`. Exported for `fold-forward.ts`, which resolves a late
 * child edit's recomputed patch against the parent's CURRENT values the exact same way.
 */
export const resolvePatch = (
  parent: Obj.Unknown,
  patch: Record<string, unknown>,
  collision: Migration.CollisionPolicy,
): ResolvedPatch => {
  const core = getObjectCore(parent);
  const values: Record<string, unknown> = {};
  const fromChild: string[] = [];
  for (const [key, childValue] of Object.entries(patch)) {
    const rawParent = core.getRaw([DATA_NAMESPACE, key]);
    const encodedChild = encodeValue(core, childValue);
    // Equal values count as absorbed: another peer may already have absorbed this child, and every
    // peer must record the same keys for the fold's `collision` bypass to agree.
    if (rawParent === undefined || encodedValuesEqual(rawParent, encodedChild)) {
      values[key] = childValue;
      fromChild.push(key);
      continue;
    }
    const parentValue: unknown = Obj.getValue(parent, [key]);
    const resolved = resolveCollision(collision, parentValue, childValue, key);
    values[key] = resolved;
    if (
      resolved === childValue ||
      (resolved !== parentValue && encodedValuesEqual(encodeValue(core, resolved), encodedChild))
    ) {
      fromChild.push(key);
    }
  }
  return { values, fromChild };
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

    // The absorb change is written at these heads, so a write replicated in while the parent loads
    // is concurrent with it and folded forward, not silently covered by the tombstone.
    const core = getObjectCore(child);
    const readHeads = core.getHeads();
    const data = { ...getDecodedDataWithRefs(db, core, readHeads), id: child.id };
    const parentRef = migration.parentOf(data);
    if (!parentRef) {
      log.info('fan-in: child has no resolvable parent yet, skipping', { child: child.id });
      continue;
    }
    const parent = await parentRef.load();

    const patch = migration.absorb(data);
    const { values: resolved, fromChild } = resolvePatch(parent, patch, migration.collision);
    assignPatch(parent, resolved, `migration: fan-in ${migration.fromType.toString()}`);
    // The parent's frontier right after the absorb write landed — a fold-forward pass forks its own
    // write from here, so it stays concurrent with everything the parent does afterward.
    const absorbedAtParentHeads = getObjectCore(parent).getHeads();

    absorbChild(child, migration, parent.id, readHeads, absorbedAtParentHeads, fromChild);
  }
};

/**
 * Tombstones `child` in the SAME automerge change as its {@link Migration.FanInMarkerAnnotation} and,
 * when `migration.to` is declared, its type switch — together, so a crash can never leave the child
 * tombstoned without the marker a fold-forward pass needs to find its late writes, or type-switched
 * without being tombstoned. Never erases: `deleted` is a flag, `child`'s data stays readable (M0-
 * REPORT.md design item 3).
 */
const absorbChild = (
  child: Obj.Unknown,
  migration: Migration.FanInMigration,
  parentId: string,
  preHeads: Heads,
  absorbedAtParentHeads: Heads,
  fromChild: readonly string[],
): void => {
  const core = getObjectCore(child);
  const mountPath = core.mountPath;
  const message = fanInAbsorbMessage(migration.id, parentId);

  const marker = core.encode(
    Schema.encodeSync(Migration.FanInMarkerSchema)({
      migration: message,
      parentId,
      preHeads: [...preHeads],
      absorbedAtParentHeads: [...absorbedAtParentHeads],
      fromChild: [...fromChild].sort(),
    }),
  );
  const typeRef = migration.toType ? EncodedReference.fromURI(migration.toType) : undefined;

  core.changeAt(
    preHeads,
    (doc) => {
      setDeep(doc, [...mountPath, SYSTEM_NAMESPACE, 'deleted'], true);
      if (typeRef) {
        setDeep(doc, [...mountPath, SYSTEM_NAMESPACE, 'type'], typeRef);
      }
      setDeep(doc, [...mountPath, META_NAMESPACE, 'annotations', Migration.FanInMarkerAnnotation.key], marker);
    },
    { message },
  );
};
