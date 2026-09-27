//
// Copyright 2026 DXOS.org
//

import {
  next as A,
  type Doc as AutomergeDoc,
  type DelPatch,
  type Heads,
  type Patch,
  type SpliceTextPatch,
} from '@automerge/automerge';
import * as Option from 'effect/Option';

import { Annotation, type Database, Filter, Lens, Migration, Obj } from '@dxos/echo';
import { DATA_NAMESPACE } from '@dxos/echo-protocol';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';

import { META_NAMESPACE } from '../core-db/index.ts';
import { getObjectCore } from '../echo-handler/index.ts';
import { encodedValuesEqual, isRecord } from './encoded-value.ts';
import { createObjectMigrationContext } from './migration-context.ts';

//
// Fold-forward as a standing rule (Phase C2/C3, `.agents/projects/lenses/IMPLEMENTATION-PLAN.md`
// Phase C; `.agents/projects/lenses/M0-REPORT.md` design items 1, 6, 9). A migrated object is
// "behind" when a retired property was written to after the migration — derivable from the document
// at any time via the migration marker (`Migration.MigrationMarkerAnnotation`), so no separate
// durable intent is kept: the marker's own `foldedAt`/`textFrontier` checkpoints are enough to make a
// re-run cheap and a crash between writes harmless (every fold is value-compare guarded).
//

/** The message `#applyObjectMigration` stamps on a migration's own change. */
const migrationMessage = (from: string, to: string): string => `migration: ${from} -> ${to}`;

/** The message a fold-forward write is stamped with; `Obj.getConflict` reads this prefix. */
const foldMessage = (from: string, to: string): string => `fold: ${from} -> ${to}`;

const sameHeadSet = (a: readonly string[], b: readonly string[]): boolean => {
  if (a.length !== b.length) {
    return false;
  }
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return sortedA.every((hash, index) => hash === sortedB[index]);
};

/**
 * Locates the automerge change that applied `marker`'s migration to this document: the one whose
 * `message` names the migration and whose `deps` are exactly the marker's `preHeads` — the runner
 * reads `preHeads` and authors that change synchronously right after, so no other change can share
 * both. Its own hash is therefore the object's post-migration frontier (heads are deliberately not a
 * stored field on the marker — see {@link Migration.MigrationMarkerAnnotation}'s own doc comment).
 */
const findPostMigrationHeads = (doc: AutomergeDoc<unknown>, marker: Migration.MigrationMarker): Heads | undefined => {
  const message = migrationMessage(marker.from, marker.to);
  const change = A.getChangesMetaSince(doc, []).find(
    (candidate) => candidate.message === message && sameHeadSet(candidate.deps, marker.preHeads),
  );
  return change && [change.hash];
};

/** One property's late writes, scoped under `[...mountPath, 'data', <key>]` and ordered as `A.diff` returned them. */
type LateWritesByKey = ReadonlyMap<string, readonly Patch[]>;

/**
 * Late writes to `retired` properties between `base` and `current` — the fold-detection primitive.
 * `action: 'conflict'` patches are metadata Automerge attaches when a concurrent op arrives late; they
 * carry no write of their own and would otherwise make an already-folded key look freshly written.
 */
const lateRetiredWrites = (
  doc: AutomergeDoc<unknown>,
  mountPath: readonly (string | number)[],
  base: Heads,
  current: Heads,
  retired: ReadonlySet<string>,
): LateWritesByKey => {
  const byKey = new Map<string, Patch[]>();
  const keyIndex = mountPath.length + 1; // [...mountPath, DATA_NAMESPACE, <key>, ...]
  for (const patch of A.diff(doc, base, current)) {
    if (patch.action === 'conflict') {
      continue;
    }
    if (patch.path.length <= keyIndex || !mountPath.every((segment, index) => patch.path[index] === segment)) {
      continue;
    }
    if (patch.path[mountPath.length] !== DATA_NAMESPACE) {
      continue;
    }
    const key = patch.path[keyIndex];
    if (typeof key !== 'string' || !retired.has(key)) {
      continue;
    }
    const list = byKey.get(key);
    if (list) {
      list.push(patch);
    } else {
      byKey.set(key, [patch]);
    }
  }
  return byKey;
};

/**
 * Late writes to a `lens`'s overlaid target properties — an old client still lensing through it writes
 * one into the object's annotation dictionary (`overlay.ts`'s own storage shape:
 * `meta.annotations[OverlayAnnotation.key][lens.id][property]`), a meta path fold-forward's usual
 * data-path diff (`lateRetiredWrites`) never sees. Returns the changed property names, not patches: an
 * overlay write is folded as a whole-value read of its CURRENT state, never replayed op-by-op.
 */
const lateOverlayWrites = (
  doc: AutomergeDoc<unknown>,
  mountPath: readonly (string | number)[],
  base: Heads,
  current: Heads,
  lensId: string,
  overlaid: ReadonlySet<string>,
): ReadonlySet<string> => {
  const properties = new Set<string>();
  const overlayPath = [...mountPath, META_NAMESPACE, 'annotations', Lens.OverlayAnnotation.key, lensId];
  const propertyIndex = overlayPath.length;
  for (const patch of A.diff(doc, base, current)) {
    if (patch.action === 'conflict') {
      continue;
    }
    if (patch.path.length <= propertyIndex || !overlayPath.every((segment, index) => patch.path[index] === segment)) {
      continue;
    }
    const property = patch.path[propertyIndex];
    if (typeof property === 'string' && overlaid.has(property)) {
      properties.add(property);
    }
  }
  return properties;
};

type TextPatch = SpliceTextPatch | DelPatch;

const isTextPatch = (patch: Patch): patch is TextPatch => patch.action === 'splice' || patch.action === 'del';

/**
 * Replays sequential splice/del patches onto `path` inside a `changeAt` callback. Each patch's
 * trailing path element is a character offset already relative to the state left by the PREVIOUS
 * patch in the list, so applying them unmodified, in order, reproduces the source edit exactly (see
 * `migration-bench/text.test.ts`'s `replayTextPatches`, the pattern this re-derives for production).
 */
const replayTextPatches = (
  doc: AutomergeDoc<unknown>,
  path: (string | number)[],
  patches: readonly TextPatch[],
): void => {
  for (const patch of patches) {
    const offset = patch.path.at(-1);
    invariant(typeof offset === 'number', 'foldForward: expected a text patch path to end in a character offset');
    if (patch.action === 'splice') {
      A.splice(doc, path, offset, 0, patch.value);
    } else {
      A.splice(doc, path, offset, patch.length ?? 1);
    }
  }
};

/**
 * Whether a lens plan entry is a bare rename: reads exactly one source property and returns it
 * unchanged. Checked behaviorally (probing `get` with a sentinel) rather than by entry `kind`/`origin`,
 * so both an explicit `Lens.from` rename and an automatic same-name mapping qualify alike — either is
 * a shape a character-wise text replay can stand in for; a `Lens.from(prop, codec)` conversion or a
 * `Derived` computation is not, and falls back to the generic whole-value fold below.
 */
const isIdentityRename = (entry: Lens.Plan['entries'][number]): boolean => {
  if (entry.from.length !== 1) {
    return false;
  }
  const probe = Symbol('fold-forward-identity-probe');
  return entry.get({ [entry.from[0]]: probe }) === probe;
};

/** The lens's target property a retired source property renames to, if the mapping is a bare rename. */
const identityRenameTarget = (lens: Lens.Any | undefined, retiredKey: string): string | undefined => {
  const entry = lens?.plan?.entries.find(
    (candidate) => candidate.from.length === 1 && candidate.from[0] === retiredKey,
  );
  return entry && isIdentityRename(entry) ? entry.property : undefined;
};

/**
 * Every property `fromType` itself declares: the union of what the lens's plan reads (`entry.from`)
 * and what it drops (`Lens.coverage(lens).dropped`) — together exactly `fromType`'s own property set
 * (`mapping.ts#plan`'s own `dropped` computation is the mirror of this). A `fromLens` migration always
 * has a plan: {@link Migration.fromLens} calls `Lens.coverage`, which throws for a coded lens before
 * the migration is ever constructed.
 */
const lensSourceKeys = (lens: Lens.Any): ReadonlySet<string> => {
  invariant(lens.plan, 'foldForward: expected a fromLens migration to carry a compiled plan');
  const keys = new Set(lens.plan.entries.flatMap((entry) => entry.from));
  for (const dropped of lens.plan.coverage.dropped) {
    keys.add(dropped);
  }
  return keys;
};

/**
 * The migration's write set recomputed from the object's CURRENT data (including retired keys) —
 * a `fromLens` migration re-runs the lens; an opaque `define` migration re-runs its `transform`. Both
 * read the same source-shaped snapshot, so a late write to a retired property is reflected exactly as
 * it would be if the migration ran again from scratch.
 */
const recomputeMigrationOutput = async (
  db: Database.Database,
  migration: Migration.ObjectMigration,
  id: string,
  snapshot: Record<string, unknown>,
): Promise<Record<string, unknown>> => {
  if (migration.lens) {
    // `snapshot` also carries the object's CURRENT (target-shaped) keys, which the source schema
    // does not declare and would reject as unknown properties — restrict to `fromType`'s own keys.
    const sourceKeys = lensSourceKeys(migration.lens);
    const sourceSnapshot = Object.fromEntries(Object.entries(snapshot).filter(([key]) => sourceKeys.has(key)));
    const detached = Obj.make(migration.lens.source, sourceSnapshot);
    const { id: _id, ...rest } = Lens.get(detached, migration.lens);
    return rest;
  }

  const output = await migration.transform({ id, ...snapshot }, createObjectMigrationContext(db));
  return isRecord(output) ? output : {};
};

/**
 * Folds one migrated object forward if a retired property changed since the marker's last checkpoint.
 * Never throws: a bad object is logged and left for the next pass rather than aborting the batch.
 */
const foldObject = async (
  db: Database.Database,
  migration: Migration.ObjectMigration,
  object: Obj.Unknown,
): Promise<void> => {
  const markerOption = Annotation.get(object, Migration.MigrationMarkerAnnotation);
  if (Option.isNone(markerOption)) {
    return;
  }
  const marker = markerOption.value;
  if (marker.from !== migration.fromType.toString() || marker.to !== migration.toType.toString()) {
    // A marker from a DIFFERENT migration into the same `toType` — not this migration's to fold.
    return;
  }

  const core = getObjectCore(object);
  const doc = core.getDoc();
  const mountPath = core.mountPath;

  if (!A.hasHeads(doc, [...marker.preHeads])) {
    // A foreign frontier (e.g. an epoch re-root) — never fold on foreign heads (M0-REPORT.md design
    // item 8): `A.diff` against them would silently report "everything is new".
    log.warn('foldForward: skipping object with foreign migration heads', { object: object.id });
    return;
  }

  const postMigrationHeads = findPostMigrationHeads(doc, marker);
  if (!postMigrationHeads) {
    log.warn('foldForward: could not locate the migration change for object', { object: object.id });
    return;
  }

  const base: Heads = marker.foldedAt ? [...marker.foldedAt] : postMigrationHeads;
  if (!A.hasHeads(doc, base)) {
    log.warn('foldForward: skipping object with a foreign fold checkpoint', { object: object.id });
    return;
  }

  const currentHeads = A.getHeads(doc);
  const retired = new Set(marker.retired);
  const lateWrites = lateRetiredWrites(doc, mountPath, base, currentHeads, retired);

  // `Lens.coverage` throws for a coded lens, but `Migration.fromLens` already calls it at definition
  // time (and only sets `lens` for a `fromLens` migration), so a lens present here always has a plan.
  const overlaid = migration.lens ? new Set(Lens.coverage(migration.lens).overlaid) : undefined;
  const overlayLateWrites =
    migration.lens && overlaid && overlaid.size > 0
      ? lateOverlayWrites(doc, mountPath, base, currentHeads, migration.lens.id, overlaid)
      : new Set<string>();

  if (lateWrites.size === 0 && overlayLateWrites.size === 0) {
    return;
  }

  // Text-identity-rename properties whose late writes are pure splice/del sequences replay
  // character-wise instead of a whole-value fold (M0-REPORT.md design item 9); everything else —
  // including a whole-value overwrite of a text property from a non-collaborative old client, or an
  // opaque `define` migration — folds through the generic recompute-and-compare pass below.
  const textFrontier: Record<string, readonly string[]> = { ...marker.textFrontier };
  const textTargets = new Set<string>();
  for (const [retiredKey, patches] of lateWrites) {
    const targetProperty = identityRenameTarget(migration.lens, retiredKey);
    if (!targetProperty || !patches.every(isTextPatch)) {
      continue;
    }
    const targetValue = Obj.getValue(object, [targetProperty]);
    const sourceValue = core.getDecoded(['data', retiredKey]);
    if (typeof targetValue !== 'string' || typeof sourceValue !== 'string') {
      continue;
    }
    const forkHeads: Heads = textFrontier[retiredKey] ? [...textFrontier[retiredKey]] : postMigrationHeads;
    if (!A.hasHeads(doc, forkHeads)) {
      log.warn('foldForward: skipping text fold with a foreign frontier', { object: object.id, property: retiredKey });
      continue;
    }
    const accessor = core.getDocAccessor([targetProperty]);
    const newForkHeads = accessor.handle.changeAt(forkHeads, (draft: AutomergeDoc<unknown>) =>
      replayTextPatches(draft, accessor.path.slice(), patches),
    );
    if (newForkHeads) {
      textFrontier[retiredKey] = newForkHeads;
      textTargets.add(targetProperty);
    }
  }

  const dataWrites = new Map<string, unknown>();
  if (lateWrites.size > 0) {
    const snapshot = core.getDecoded(['data']);
    invariant(isRecord(snapshot), 'foldForward: expected an object body at the data path');
    const output = await recomputeMigrationOutput(db, migration, object.id, snapshot);
    for (const [key, value] of Object.entries(output)) {
      if (key === 'id' || value === undefined || textTargets.has(key)) {
        continue;
      }
      const encoded = core.encode(value);
      if (!encodedValuesEqual(encoded, core.getRaw([DATA_NAMESPACE, key]))) {
        dataWrites.set(key, encoded);
      }
    }
  }

  // An overlay write is never part of `snapshot` (it lives in meta, not data), so it is folded from
  // the object's CURRENT overlay value directly, whole-value, into the SAME `dataWrites` batch —
  // one `foldAt` change per object regardless of how many of its properties fell behind.
  if (migration.lens) {
    for (const property of overlayLateWrites) {
      if (dataWrites.has(property)) {
        continue;
      }
      const value = Lens.getOverlay(object, migration.lens.id, property);
      if (value === undefined) {
        continue;
      }
      const encoded = core.encode(value);
      if (!encodedValuesEqual(encoded, core.getRaw([DATA_NAMESPACE, property]))) {
        dataWrites.set(property, encoded);
      }
    }
  }

  if (dataWrites.size > 0) {
    core.foldAt(
      postMigrationHeads,
      (data) => {
        for (const [key, value] of dataWrites) {
          data[key] = value;
        }
      },
      { message: foldMessage(marker.from, marker.to) },
    );
  }

  // Ordinary (non-fold) write: this is the runner's own bookkeeping, never user data, so the live
  // actor and current heads are exactly right — a crash before this lands just re-diffs a wider,
  // value-compared (harmless) range on the next pass.
  Obj.update(object, (object) => {
    Annotation.set(object, Migration.MigrationMarkerAnnotation, {
      ...marker,
      foldedAt: [...A.getHeads(core.getDoc())],
      textFrontier,
    });
  });
};

/** Options for {@link foldForwardMigrations}. */
export type FoldForwardOptions = {
  /** Restricts the pass to these objects, so an update-triggered pass skips unchanged history. */
  objectIds?: ReadonlySet<string>;
};

/**
 * Scans objects of each object migration's `toType` carrying that migration's marker, and folds any
 * that fell behind — see {@link foldObject}. Rename migrations carry no marker and are skipped.
 */
export const foldForwardMigrations = async (
  db: Database.Database,
  migrations: Migration.Migration[],
  options: FoldForwardOptions = {},
): Promise<void> => {
  for (const migration of migrations) {
    if (!Migration.isObjectMigration(migration)) {
      continue;
    }

    const objects = await db.query(Filter.type(migration.toType)).run();
    for (const object of objects) {
      if (options.objectIds && !options.objectIds.has(object.id)) {
        continue;
      }
      try {
        await foldObject(db, migration, object);
      } catch (err) {
        log.warn('foldForward: failed to fold an object forward', { object: object.id, err });
      }
    }
  }
};
