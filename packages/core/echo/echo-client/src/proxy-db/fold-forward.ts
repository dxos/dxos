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

import { Annotation, type Database, Filter, Lens, Migration, Obj, Query, Ref } from '@dxos/echo';
import { DATA_NAMESPACE } from '@dxos/echo-protocol';
import { invariant } from '@dxos/invariant';
import { EID } from '@dxos/keys';
import { log } from '@dxos/log';
import { setDeep } from '@dxos/util';

import { META_NAMESPACE, type ObjectCore } from '../core-db/index.ts';
import { getObjectCore } from '../echo-handler/index.ts';
import { computeGuardedDataWrites, encodedValuesEqual, isRecord } from './encoded-value.ts';
import { resolvePatch } from './fan-in.ts';
import {
  type ConvergenceKeyCache,
  createObjectMigrationContext,
  ensureByConvergenceKey,
  findByConvergenceKey,
} from './migration-context.ts';

//
// Fold-forward as a standing rule (Phase C2/C3, `.agents/projects/lenses/IMPLEMENTATION-PLAN.md`
// Phase C; `.agents/projects/lenses/M0-REPORT.md` design items 1, 6, 9). A migrated object is
// "behind" when a retired property was written to after its step's migration — derivable from the
// document at any time via the migration marker (`Migration.MigrationMarkerAnnotation`), so no
// separate durable intent is kept: each step's own `foldedAt`/`textFrontier` checkpoint is enough to
// make a re-run cheap and a crash between writes harmless (every fold is value-compare guarded). A
// marker holds a CHAIN of steps (`Migration.getSteps`), one per `from -> to` boundary the object has
// crossed, so a late write in the object's ORIGINAL shape still folds all the way to its current type
// even after several migrations — see {@link foldObject}.
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
 * Locates the automerge change that applied `step`'s migration to this document: the one whose
 * `message` names the migration and whose `deps` are exactly the step's `preHeads` — the runner
 * reads `preHeads` and authors that change synchronously right after, so no other change can share
 * both. Its own hash is therefore the object's post-migration frontier (heads are deliberately not a
 * stored field on the marker — see {@link Migration.MigrationMarkerAnnotation}'s own doc comment).
 */
const findPostMigrationHeads = (doc: AutomergeDoc<unknown>, step: Migration.MigrationStep): Heads | undefined => {
  const message = migrationMessage(step.from, step.to);
  const change = A.getChangesMetaSince(doc, []).find(
    (candidate) => candidate.message === message && sameHeadSet(candidate.deps, step.preHeads),
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
 * Folds one migration STEP forward if a retired property changed since that step's own checkpoint.
 * Never throws: a bad step is logged and left for the next pass rather than aborting the object's
 * other steps or the batch.
 *
 * Reads `getObjectCore(object).getDoc()` fresh on every call (never a doc reference the caller already
 * held) — this is what makes chained steps compose: step `k`'s fold writes directly onto the document,
 * so by the time step `k + 1` (which folds the retired properties STEP `k` itself may have just written)
 * runs, its own `A.diff`/snapshot reads see step `k`'s fold as part of history, exactly as if an old
 * client had written it.
 */
const foldStep = async (
  db: Database.Database,
  migration: Migration.ObjectMigration,
  step: Migration.MigrationStep,
  stepIndex: number,
  object: Obj.Unknown,
): Promise<void> => {
  const core = getObjectCore(object);
  const doc = core.getDoc();
  const mountPath = core.mountPath;

  if (!A.hasHeads(doc, [...step.preHeads])) {
    // A foreign frontier (e.g. an epoch re-root) — never fold on foreign heads (M0-REPORT.md design
    // item 8): `A.diff` against them would silently report "everything is new".
    log.warn('foldForward: skipping step with foreign migration heads', { object: object.id, stepIndex });
    return;
  }

  const postMigrationHeads = findPostMigrationHeads(doc, step);
  if (!postMigrationHeads) {
    log.warn('foldForward: could not locate the migration change for step', { object: object.id, stepIndex });
    return;
  }

  const base: Heads = step.foldedAt ? [...step.foldedAt] : postMigrationHeads;
  if (!A.hasHeads(doc, base)) {
    log.warn('foldForward: skipping step with a foreign fold checkpoint', { object: object.id, stepIndex });
    return;
  }

  const currentHeads = A.getHeads(doc);
  const retired = new Set(step.retired);
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
  const textFrontier: Record<string, readonly string[]> = { ...step.textFrontier };
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
  // one `foldAt` change per step regardless of how many of its properties fell behind.
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
      // Scoped to this object AND this step: a shared actor across steps (or objects) could otherwise
      // fork from a LATER step's fold, which itself already carries a direct edit made between the two
      // steps, and so wrongly inherit that edit as an ancestor instead of staying concurrent with it.
      { message: foldMessage(step.from, step.to), scope: `${object.id}:${stepIndex}` },
    );
  }

  // Ordinary (non-fold) write: this is the runner's own bookkeeping, never user data, so the live
  // actor and current heads are exactly right — a crash before this lands just re-diffs a wider,
  // value-compared (harmless) range on the next pass. Written directly at `steps[stepIndex]`, never
  // as a whole-marker (or whole-step) replace, so a sibling step's own checkpoint — or one a
  // concurrent peer is writing to a DIFFERENT step of the same marker — is never disturbed.
  const stepPath = [
    ...mountPath,
    META_NAMESPACE,
    'annotations',
    Migration.MigrationMarkerAnnotation.key,
    'steps',
    stepIndex,
  ];
  const foldedAt = core.encode([...A.getHeads(core.getDoc())]);
  const encodedTextFrontier = core.encode(textFrontier);
  core.change((doc) => {
    setDeep(doc, [...stepPath, 'foldedAt'], foldedAt);
    setDeep(doc, [...stepPath, 'textFrontier'], encodedTextFrontier);
  });
};

/**
 * Folds every step of one migrated object's marker forward, in order (oldest first): step `k`'s own
 * migration is found by matching its recorded `from`/`to` against `migrations` (the full list passed
 * to {@link foldForwardMigrations}, not just the one whose query matched this object), so an object
 * that has already advanced past an intermediate type is still folded from its FIRST unfolded step.
 * A step whose migration is not among `migrations` is skipped (logged), never treated as a reason to
 * skip the steps after it. Never throws: a bad object is logged and left for the next pass.
 */
const foldObject = async (
  db: Database.Database,
  migrations: readonly Migration.Migration[],
  object: Obj.Unknown,
): Promise<void> => {
  const markerOption = Annotation.get(object, Migration.MigrationMarkerAnnotation);
  if (Option.isNone(markerOption)) {
    return;
  }

  const steps = Migration.getSteps(markerOption.value);
  for (let stepIndex = 0; stepIndex < steps.length; stepIndex++) {
    const step = steps[stepIndex];
    const migration = migrations.find(
      (candidate): candidate is Migration.ObjectMigration =>
        Migration.isObjectMigration(candidate) &&
        candidate.fromType.toString() === step.from &&
        candidate.toType.toString() === step.to,
    );
    if (!migration) {
      log.verbose('foldForward: no migration passed in for a recorded step, skipping it', {
        object: object.id,
        stepIndex,
        from: step.from,
        to: step.to,
      });
      continue;
    }

    await foldStep(db, migration, step, stepIndex, object);
  }
};

//
// Fan-in fold-forward (`.agents/projects/lenses/IMPLEMENTATION-PLAN.md` "Limit fixes" item 3;
// M0-REPORT.md design item 3): a tombstoned fan-in child is excluded from every DEFAULT query, so
// finding one that fell behind requires the same `deleted: 'include'` option `merge-replay.test.ts`
// uses for a merged-away object. There is no per-step chain here (a child is absorbed exactly once,
// by exactly one fan-in) — the child's own {@link Migration.FanInMarkerAnnotation} is the whole state.
//

/** The message a fan-in fold-forward write onto the PARENT is stamped with; mirrors {@link foldMessage}. */
const fanInFoldMessage = (fromType: string, parentId: string): string => `fold: fan-in ${fromType} -> ${parentId}`;

/**
 * Locates the automerge change that absorbed `child`: the one whose `message` equals the marker's own
 * `migration` field and whose `deps` are exactly `marker.preHeads` — {@link runFanInMigration} (in
 * `fan-in.ts`) authors that change synchronously right after reading `preHeads`, so no other change on
 * the child's document can share both. Mirrors {@link findPostMigrationHeads} for object migrations.
 */
const findFanInAbsorbHeads = (doc: AutomergeDoc<unknown>, marker: Migration.FanInMarker): Heads | undefined => {
  const change = A.getChangesMetaSince(doc, []).find(
    (candidate) => candidate.message === marker.migration && sameHeadSet(candidate.deps, marker.preHeads),
  );
  return change && [change.hash];
};

/**
 * Whether ANY of `child`'s own data changed between `base` and `current`. A tombstoned fan-in child has
 * no narrower "retired" set the way an object-migration step does (`step.retired` names exactly the
 * properties the transform dropped) — once absorbed, its WHOLE body is behind everything `absorb` might
 * read, so any data write since the checkpoint is a candidate late write.
 */
const hasLateChildWrites = (
  doc: AutomergeDoc<unknown>,
  mountPath: readonly (string | number)[],
  base: Heads,
  current: Heads,
): boolean => {
  const dataPath = [...mountPath, DATA_NAMESPACE];
  return A.diff(doc, base, current).some(
    (patch) => patch.action !== 'conflict' && dataPath.every((segment, index) => patch.path[index] === segment),
  );
};

/**
 * Resolves a late-recomputed `patch` against `parent`'s CURRENT values for the fold-forward path: a key
 * in `fromChild` is the child updating ITS OWN prior contribution (the parent had no value for it, or
 * `collision` already picked the child's value, at absorb time — see {@link Migration.FanInMarkerSchema}'s
 * `fromChild` doc comment) and folds straight through, never back through `collision` — re-running the
 * policy would compare against a parent value that only exists because this SAME child put it there,
 * which is exactly what froze a `parent-wins` fan-in's absorption forever before this existed. A key NOT
 * in `fromChild` is still subject to `collision`, same as the initial absorption (`fan-in.ts#resolvePatch`).
 * `fromChild: undefined` — a marker written before this field existed — falls back to the old, uniform
 * behavior: every changed key goes through `collision` against the parent's current value.
 */
const resolveFoldPatch = (
  parent: Obj.Unknown,
  patch: Record<string, unknown>,
  collision: Migration.CollisionPolicy,
  fromChild: ReadonlySet<string> | undefined,
): Record<string, unknown> => {
  const policyResolved = resolvePatch(parent, patch, collision).values;
  if (!fromChild) {
    return policyResolved;
  }
  const resolved = { ...policyResolved };
  for (const key of fromChild) {
    if (Object.hasOwn(patch, key)) {
      resolved[key] = patch[key];
    }
  }
  return resolved;
};

/**
 * Folds one absorbed child forward if it received a late (old-client) write since its own checkpoint:
 * recomputes {@link Migration.FanInMigration.absorb} from the child's CURRENT data (including the late
 * write) and resolves the result against the PARENT's CURRENT values — {@link resolveFoldPatch}, the
 * `fromChild`-aware variant of `fan-in.ts#resolvePatch` — then writes the guarded difference into the
 * parent with `foldAt` at the recorded `absorbedAtParentHeads`, concurrent with everything the parent
 * has done since, so a direct edit on the same property becomes a real conflict instead of being
 * silently overwritten. Never throws: a missing parent or a foreign frontier is logged and left for the
 * next pass. A re-run with nothing new recomputes the same guarded-equal patch and writes nothing.
 */
const foldFanInChild = async (
  db: Database.Database,
  migration: Migration.FanInMigration,
  child: Obj.Unknown,
  marker: Migration.FanInMarker,
): Promise<void> => {
  const core = getObjectCore(child);
  const doc = core.getDoc();
  const mountPath = core.mountPath;

  if (!A.hasHeads(doc, [...marker.preHeads])) {
    log.warn('foldForward: skipping fan-in child with foreign absorb heads', { child: child.id });
    return;
  }

  const absorbHeads = findFanInAbsorbHeads(doc, marker);
  if (!absorbHeads) {
    log.warn('foldForward: could not locate the absorb change for a fan-in child', { child: child.id });
    return;
  }

  const base: Heads = marker.foldedAt ? [...marker.foldedAt] : absorbHeads;
  if (!A.hasHeads(doc, base)) {
    log.warn('foldForward: skipping fan-in child with a foreign fold checkpoint', { child: child.id });
    return;
  }

  const currentHeads = A.getHeads(doc);
  if (!hasLateChildWrites(doc, mountPath, base, currentHeads)) {
    return;
  }

  const [parent] = await db.query(Filter.id(marker.parentId)).run();
  if (!parent) {
    log.warn('foldForward: fan-in parent no longer resolvable, skipping', {
      child: child.id,
      parent: marker.parentId,
    });
    return;
  }
  const parentCore = getObjectCore(parent);
  if (!A.hasHeads(parentCore.getDoc(), [...marker.absorbedAtParentHeads])) {
    log.warn('foldForward: skipping fan-in child whose absorb-time parent heads are foreign', { child: child.id });
    return;
  }

  const snapshot = core.getDecoded(['data']);
  invariant(isRecord(snapshot), 'foldForward: expected an object body at a fan-in child data path');
  const patch = migration.absorb(parent, { id: child.id, ...snapshot });
  const fromChild = marker.fromChild ? new Set(marker.fromChild) : undefined;
  const resolved = resolveFoldPatch(parent, patch, migration.collision, fromChild);
  const dataWrites = computeGuardedDataWrites(parentCore, resolved);

  if (dataWrites.size > 0) {
    parentCore.foldAt(
      [...marker.absorbedAtParentHeads],
      (data) => {
        for (const [key, value] of dataWrites) {
          data[key] = value;
        }
      },
      { message: fanInFoldMessage(migration.fromType.toString(), marker.parentId), scope: `fan-in:${child.id}` },
    );
  }

  // Advanced in place (never a whole-marker replace), like `foldStep`'s own `foldedAt` write — a
  // sibling field of this same marker (or a concurrent peer's identical fold checkpoint) is never
  // disturbed. Ordinary (non-fold) write: the runner's own bookkeeping, never user data.
  const markerPath = [...mountPath, META_NAMESPACE, 'annotations', Migration.FanInMarkerAnnotation.key];
  const foldedAt = core.encode([...currentHeads]);
  core.change((doc) => {
    setDeep(doc, [...markerPath, 'foldedAt'], foldedAt);
  });
};

/**
 * Folds every already-absorbed child of one {@link Migration.FanInMigration} forward — see
 * {@link foldFanInChild}. Queried with `deleted: 'include'` since an absorbed child is a tombstone,
 * excluded from every default query.
 */
const foldFanInMigration = async (
  db: Database.Database,
  migration: Migration.FanInMigration,
  processed: Set<string>,
  options: FoldForwardOptions,
): Promise<void> => {
  const children: Obj.Unknown[] = await db
    .query(Query.select(Filter.type(migration.fromType)).options({ deleted: 'include' }))
    .run();
  for (const child of children) {
    if (options.objectIds && !options.objectIds.has(child.id)) {
      continue;
    }
    if (processed.has(child.id)) {
      continue;
    }
    const markerOption = Annotation.get(child, Migration.FanInMarkerAnnotation);
    if (Option.isNone(markerOption)) {
      continue; // Not yet absorbed -- `runFanInMigration` handles a still-live child, not this pass.
    }
    processed.add(child.id);
    try {
      await foldFanInChild(db, migration, child, markerOption.value);
    } catch (err) {
      log.warn('foldForward: failed to fold a fan-in child forward', { child: child.id, err });
    }
  }
};

//
// Array fan-out fold-forward (`.agents/projects/lenses/IMPLEMENTATION-PLAN.md` "Limit fixes" item 4;
// M0-REPORT.md design item 5's residual): an old client can keep writing the kept source array after
// the split — editing an element's fields, adding a new id'd element, adding an element with no id at
// all, or removing one — and none of it reached the fanned-out children until now. The marker lives on
// the PARENT (unlike fan-in's per-child marker), since the source array — not any one child — is what
// a late write lands on.
//

/** The message an array fan-out fold-forward write onto a CHILD is stamped with; mirrors {@link foldMessage}. */
const arrayFanOutFoldMessage = (fromType: string, toType: string): string =>
  `fold: array-fan-out ${fromType} -> ${toType}`;

/**
 * Locates the automerge change that split `parent`: the one whose `message` equals the marker's own
 * `migration` field and whose `deps` are exactly `marker.preHeads` — {@link applyArrayFanOut} (in
 * `array-fan-out.ts`) authors that change synchronously right after reading `preHeads`, so no other
 * change on the parent's document can share both. Mirrors {@link findFanInAbsorbHeads}.
 */
const findArrayFanOutSplitHeads = (
  doc: AutomergeDoc<unknown>,
  marker: Migration.ArrayFanOutMarker,
): Heads | undefined => {
  const change = A.getChangesMetaSince(doc, []).find(
    (candidate) => candidate.message === marker.migration && sameHeadSet(candidate.deps, marker.preHeads),
  );
  return change && [change.hash];
};

/**
 * Whether the source array property changed between `base` and `current` — the fold-detection
 * primitive for array fan-out, scoped to one property the same way {@link lateRetiredWrites} scopes to
 * a retired key, but reporting presence only: every element of the CURRENT array is re-derived from
 * scratch once any change is found, rather than replayed patch-by-patch.
 */
const hasLateArrayWrites = (
  doc: AutomergeDoc<unknown>,
  mountPath: readonly (string | number)[],
  property: string,
  base: Heads,
  current: Heads,
): boolean => {
  const propertyPath = [...mountPath, DATA_NAMESPACE, property];
  return A.diff(doc, base, current).some(
    (patch) =>
      patch.action !== 'conflict' &&
      patch.path.length >= propertyPath.length &&
      propertyPath.every((segment, index) => patch.path[index] === segment),
  );
};

/**
 * An `ObjectCore`'s own creation heads: the frontier right after the earliest change whose diff
 * touches its `mountPath` — the change that created its entry. Reimplemented here rather than
 * imported from `deriveCreationHeads` (`@dxos/echo-host`'s `convergence-key-merge.ts`, which
 * `echo-client` could import without a cycle): that version is keyed to a HOST-side
 * `DatabaseDirectory`'s fixed `objects.<id>` layout, while an `ObjectCore` addresses its object through
 * an arbitrary `mountPath` (`[]` for a single-object document in tests, `['objects', id]` in
 * production) — this is the same mountPath-agnostic frontier-accumulation idiom `getObjectChanges`
 * (`echo-handler/edit-history.ts`) already uses for exactly this kind of walk.
 */
const deriveChildCreationHeads = (core: ObjectCore): Heads | undefined => {
  const doc = core.getDoc();
  const mountPath = core.mountPath;
  let frontier: Heads = [];
  for (const meta of A.getChangesMetaSince(doc, [])) {
    const previous = frontier;
    frontier = [...previous.filter((hash) => !meta.deps.includes(hash)), meta.hash].sort();
    const patches = A.diff(doc, previous, frontier);
    if (
      patches.some(
        (patch) =>
          patch.path.length >= mountPath.length && mountPath.every((segment, index) => patch.path[index] === segment),
      )
    ) {
      return frontier;
    }
  }
  return undefined;
};

/**
 * Appends a ref to `child` onto `parent`'s `toProperty`, at the next index — never a whole-array
 * replace, so a sibling child ref another peer already wrote (or is concurrently writing) is never
 * clobbered. Idempotent within one peer's own view: a ref already present for `child` is not
 * duplicated, though two peers folding the very same late-added element independently can each still
 * append their own copy before either replicates to the other — {@link dedupeArrayFanOutRefs} is what
 * collapses that down to one entry once both peers see each other.
 */
const appendArrayFanOutRef = (parent: Obj.Unknown, toProperty: string, child: Obj.Unknown): void => {
  Obj.update(parent, (parent) => {
    let refs: unknown = Obj.getValue(parent, [toProperty]);
    if (!Array.isArray(refs)) {
      Obj.setValue(parent, [toProperty], []);
      refs = Obj.getValue(parent, [toProperty]);
    }
    if (Array.isArray(refs) && !refs.some(Ref.hasEntityId(child.id))) {
      refs.push(Ref.make(child));
    }
  });
};

/**
 * The live end of a `mergedInto` redirect chain starting at `id`: an id whose entity has no further
 * redirect, or that could not be loaded at all (foreign, deleted-and-gone). Durable and
 * `deleted: 'include'`-scoped — like {@link foldFanInMigration}'s own query — since the loser of a merge
 * is always tombstoned; a plain default-scoped query would never see it and so could never find its
 * `mergedInto` field. Cycle-guarded the same way `ObjectCore`'s own private redirect walk is: a repeated
 * id (corrupt data) stops the walk at the last id seen rather than looping forever.
 */
const resolveArrayFanOutRefTarget = async (db: Database.Database, id: string): Promise<string> => {
  let current = id;
  const seen = new Set<string>([current]);
  for (;;) {
    const [candidate] = await db.query(Query.select(Filter.id(current)).options({ deleted: 'include' })).run();
    const next = candidate ? getObjectCore(candidate).getMergedInto() : undefined;
    if (next === undefined || seen.has(next)) {
      return current;
    }
    current = next;
    seen.add(current);
  }
};

/**
 * Deletes any LATER entry of `toProperty` whose target resolves — directly, or through a `mergedInto`
 * redirect chain (see {@link resolveArrayFanOutRefTarget}) — to the same live child as an earlier entry.
 * Never a whole-array replace: one `splice` per duplicate index, from the highest index down so
 * removing one never shifts another still-pending index out from under it. A duplicate arises when two
 * peers independently fold-append a ref for the same late-added element before either replicates the
 * other's write ({@link appendArrayFanOutRef}), or when two elements' children are later merged by the
 * convergence-key merger. `findOrphanedChildren` is a different diagnostic (a child whose element id the
 * parent's array no longer shows) and does not cover this case.
 */
const dedupeArrayFanOutRefs = async (db: Database.Database, parent: Obj.Unknown, toProperty: string): Promise<void> => {
  const refs: unknown = Obj.getValue(parent, [toProperty]);
  if (!Array.isArray(refs) || refs.length < 2) {
    return;
  }

  const resolvedIds: (string | undefined)[] = [];
  for (const ref of refs) {
    if (!Ref.isRef(ref)) {
      resolvedIds.push(undefined);
      continue;
    }
    const uri = EID.tryParse(ref.uri);
    const id = uri && EID.isLocal(uri) ? EID.getEntityId(uri) : undefined;
    resolvedIds.push(id === undefined ? undefined : await resolveArrayFanOutRefTarget(db, id));
  }

  const seen = new Set<string>();
  const duplicateIndexes: number[] = [];
  for (let index = 0; index < resolvedIds.length; index++) {
    const id = resolvedIds[index];
    if (id === undefined) {
      continue;
    }
    if (seen.has(id)) {
      duplicateIndexes.push(index);
    } else {
      seen.add(id);
    }
  }
  if (duplicateIndexes.length === 0) {
    return;
  }

  Obj.update(parent, (parent) => {
    const refs: unknown = Obj.getValue(parent, [toProperty]);
    if (!Array.isArray(refs)) {
      return;
    }
    for (const index of [...duplicateIndexes].sort((left, right) => right - left)) {
      refs.splice(index, 1);
    }
  });
};

/**
 * Folds one element of the CURRENT source array forward: an element whose child already exists gets
 * `toChild(element)` recomputed and the difference folded into that CHILD, at the child's OWN creation
 * heads, so a direct edit to the child made since fold concurrently rather than being overwritten — the
 * array-fan-out counterpart of {@link foldFanInChild}. An element whose child does not exist yet (added
 * by an old client after the split, but already carrying a stable id) has one created now
 * ({@link ensureByConvergenceKey}) and its ref appended. Never throws: a missing child core or foreign
 * creation heads is logged and left for the next pass.
 *
 * `childCache` folds every element's lookup into one durable query per parent-fold ({@link
 * findByConvergenceKey}/{@link ensureByConvergenceKey} share it against `migration.child`), never
 * `runSync`'s local working set, which reflects only objects THIS session itself created or already
 * loaded — too little for a child another peer's earlier pass created, or one this session created in
 * an earlier, separate `runMigrations` call.
 */
const foldArrayFanOutElement = async (
  db: Database.Database,
  migration: Migration.ArrayFanOutMigration,
  parent: Obj.Unknown,
  elementId: string,
  element: Record<string, unknown>,
  childCache: ConvergenceKeyCache,
): Promise<void> => {
  const convergenceKey = Migration.makeArrayFanOutConvergenceKey(
    migration.fromType.toString(),
    parent.id,
    migration.childRole ?? migration.property,
    elementId,
  );
  const recomputed: Record<string, unknown> = Object.fromEntries(Object.entries(migration.toChild(element)));
  const existingChild = await findByConvergenceKey(db, migration.child, convergenceKey, childCache);

  if (!existingChild) {
    // Added late by an old client that already knew how to stamp an id, but never learned `toType` —
    // its write never reaches a child until a fold-forward pass creates one.
    const child = await ensureByConvergenceKey(db, migration.child, convergenceKey, recomputed, childCache);
    appendArrayFanOutRef(parent, migration.toProperty, child);
    return;
  }

  const childCore = getObjectCore(existingChild);
  const creationHeads = deriveChildCreationHeads(childCore);
  if (!creationHeads) {
    log.warn('foldForward: could not derive creation heads for an array fan-out child', { child: existingChild.id });
    return;
  }

  const dataWrites = computeGuardedDataWrites(childCore, recomputed);
  if (dataWrites.size === 0) {
    return;
  }
  childCore.foldAt(
    creationHeads,
    (data) => {
      for (const [key, value] of dataWrites) {
        data[key] = value;
      }
    },
    {
      message: arrayFanOutFoldMessage(migration.fromType.toString(), migration.toType.toString()),
      scope: `array-fan-out:${parent.id}:${elementId}`,
    },
  );
};

/**
 * Folds one split parent's source array forward if it changed since the split (or the last fold) —
 * see the module doc comment for each element case. An element with no id yet is left alone (logged):
 * the next id-stamping pass covers it (see `runStampElementIdsMigration`'s own doc comment on covering
 * already-split parents), and the fold-forward pass after that picks it up once it has one. A removed
 * element is simply absent from the current array and so never visited here — its child is neither
 * deleted nor folded, left exactly as {@link findOrphanedChildren} expects to find (and report) it.
 * `marker` is THIS migration's own property's marker, already picked out of the parent's per-property
 * map by the caller — see {@link Migration.getArrayFanOutMarkers}.
 */
const foldArrayFanOutParent = async (
  db: Database.Database,
  migration: Migration.ArrayFanOutMigration,
  parent: Obj.Unknown,
  marker: Migration.ArrayFanOutMarker,
): Promise<void> => {
  const core = getObjectCore(parent);
  const doc = core.getDoc();
  const mountPath = core.mountPath;

  if (!A.hasHeads(doc, [...marker.preHeads])) {
    log.warn('foldForward: skipping array fan-out parent with foreign split heads', { parent: parent.id });
    return;
  }

  const splitHeads = findArrayFanOutSplitHeads(doc, marker);
  if (!splitHeads) {
    log.warn('foldForward: could not locate the split change for an array fan-out parent', { parent: parent.id });
    return;
  }

  const base: Heads = marker.foldedAt ? [...marker.foldedAt] : splitHeads;
  if (!A.hasHeads(doc, base)) {
    log.warn('foldForward: skipping array fan-out parent with a foreign fold checkpoint', { parent: parent.id });
    return;
  }

  const currentHeads = A.getHeads(doc);
  if (hasLateArrayWrites(doc, mountPath, marker.property, base, currentHeads)) {
    const items: unknown = Obj.getValue(parent, [marker.property]);
    if (Array.isArray(items)) {
      // Shared across every element of THIS pass — one durable query per parent-fold, not one per
      // element (see `foldArrayFanOutElement`'s own doc comment on `childCache`).
      const childCache: ConvergenceKeyCache = new Map();
      for (const item of items) {
        if (!isRecord(item)) {
          continue;
        }
        const elementIdValue = item[marker.elementId];
        if (typeof elementIdValue !== 'string') {
          log.info('foldForward: array fan-out element has no stable id yet, leaving it for the stamping migration', {
            parent: parent.id,
          });
          continue;
        }
        await foldArrayFanOutElement(db, migration, parent, elementIdValue, item, childCache);
      }
    }

    // Ordinary (non-fold) write, advanced in place under THIS property's own key — never a
    // whole-annotation (or whole-marker) replace, so a sibling property's marker (or a concurrent
    // peer's identical checkpoint) is never disturbed.
    const markerPath = [
      ...mountPath,
      META_NAMESPACE,
      'annotations',
      Migration.ArrayFanOutMarkerAnnotation.key,
      marker.property,
    ];
    const foldedAt = core.encode([...A.getHeads(core.getDoc())]);
    core.change((doc) => {
      setDeep(doc, [...markerPath, 'foldedAt'], foldedAt);
    });
  }

  // Independent of whether the source array itself changed this pass: a duplicate ref can arrive via
  // replication alone (a peer's own append, or a merge collapsing two children) with no corresponding
  // write to `property` on THIS peer.
  await dedupeArrayFanOutRefs(db, parent, migration.toProperty);
};

/**
 * Folds every split parent of one {@link Migration.ArrayFanOutMigration} forward — see
 * {@link foldArrayFanOutParent}. Queried by `toType`, like an ordinary object migration: a split parent
 * keeps its identity (never tombstoned), just a new type. Tracks visited parents in a set local to THIS
 * migration (not the caller's shared `processed`): two different `ArrayFanOutMigration`s can share a
 * `toType` while fanning out two DIFFERENT properties of the same parent, each under its own marker key
 * (see {@link Migration.getArrayFanOutMarkers}), and each must still get its own fold pass over that
 * parent.
 */
const foldArrayFanOutMigration = async (
  db: Database.Database,
  migration: Migration.ArrayFanOutMigration,
  options: FoldForwardOptions,
): Promise<void> => {
  const visited = new Set<string>();
  const parents: Obj.Unknown[] = await db.query(Filter.type(migration.toType)).run();
  for (const parent of parents) {
    if (options.objectIds && !options.objectIds.has(parent.id)) {
      continue;
    }
    if (visited.has(parent.id)) {
      continue;
    }
    visited.add(parent.id);
    const markerMapOption = Annotation.get(parent, Migration.ArrayFanOutMarkerAnnotation);
    if (Option.isNone(markerMapOption)) {
      continue; // Not yet split -- `runArrayFanOutMigration` handles a still-live `from` parent, not this pass.
    }
    const marker = Migration.getArrayFanOutMarkers(markerMapOption.value)[migration.property];
    if (!marker) {
      continue; // A marker exists for a DIFFERENT property of this parent, not this migration's.
    }
    try {
      await foldArrayFanOutParent(db, migration, parent, marker);
    } catch (err) {
      log.warn('foldForward: failed to fold an array fan-out parent forward', { parent: parent.id, err });
    }
  }
};

/** Options for {@link foldForwardMigrations}. */
export type FoldForwardOptions = {
  /** Restricts the pass to these objects, so an update-triggered pass skips unchanged history. */
  objectIds?: ReadonlySet<string>;
};

/**
 * Scans objects of each object migration's `toType`, and folds every one that carries a migration
 * marker and fell behind — see {@link foldObject}. An object is visited at most once per call even
 * though several migrations' `toType` queries could in principle name it (its current type matches
 * exactly one of them in practice); {@link foldObject} then walks its WHOLE step chain, not just the
 * step belonging to the migration whose query found it. Rename migrations carry no marker and are
 * skipped. A {@link Migration.FanInMigration} is folded via {@link foldFanInMigration} instead — its
 * children live under a different type (`fromType`, not `toType`) and are tombstoned, not renamed. A
 * {@link Migration.ArrayFanOutMigration} is folded via {@link foldArrayFanOutMigration}: its marker
 * lives on the split PARENT (a `toType` object, like an ordinary object migration), not on any child.
 */
export const foldForwardMigrations = async (
  db: Database.Database,
  migrations: Migration.Migration[],
  options: FoldForwardOptions = {},
): Promise<void> => {
  const processed = new Set<string>();
  for (const migration of migrations) {
    if (Migration.isObjectMigration(migration)) {
      const objects = await db.query(Filter.type(migration.toType)).run();
      for (const object of objects) {
        if (options.objectIds && !options.objectIds.has(object.id)) {
          continue;
        }
        if (processed.has(object.id)) {
          continue;
        }
        processed.add(object.id);
        try {
          await foldObject(db, migrations, object);
        } catch (err) {
          log.warn('foldForward: failed to fold an object forward', { object: object.id, err });
        }
      }
    } else if (Migration.isFanInMigration(migration)) {
      await foldFanInMigration(db, migration, processed, options);
    } else if (Migration.isArrayFanOutMigration(migration)) {
      await foldArrayFanOutMigration(db, migration, options);
    }
  }
};
