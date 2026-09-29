//
// Copyright 2026 DXOS.org
//

import { next as A, type Doc as AutomergeDoc, type Heads, type Patch } from '@automerge/automerge';
import * as Option from 'effect/Option';

import { Annotation, type Database, Filter, Lens, Migration, Obj, Query, Ref } from '@dxos/echo';
import { DATA_NAMESPACE, EncodedReference, isEncodedReference } from '@dxos/echo-protocol';
import { MetaId } from '@dxos/echo/internal';
import { SchemaEx } from '@dxos/effect';
import { invariant } from '@dxos/invariant';
import { EntityId, URI } from '@dxos/keys';
import { log } from '@dxos/log';
import { getDeep, setDeep } from '@dxos/util';

import { META_NAMESPACE, type ObjectCore, SYSTEM_NAMESPACE } from '../core-db/index.ts';
import { getObjectCore } from '../echo-handler/index.ts';
import { arrayFanOutSplitMessage, hasUnresolvedIdConflict } from './array-fan-out.ts';
import {
  changedOutputEntries,
  computeGuardedDataWrites,
  encodedValuesEqual,
  getDecodedDataWithRefs,
  isRecord,
  mapRefsToEncodedReferences,
  removedOutputKeys,
} from './encoded-value.ts';
import { fanInAbsorbMessage, resolvePatch } from './fan-in.ts';
import { type ConvergenceKeyCache, ensureByConvergenceKey, findByConvergenceKey } from './migration-context.ts';

//
// Fold-forward as a standing rule (Phase C2/C3, `.agents/projects/lenses/IMPLEMENTATION-PLAN.md`
// Phase C; `.agents/projects/lenses/M0-REPORT.md` design items 1, 6, 9). A migrated object is
// "behind" when a retired property was written to after its step's migration — derivable from the
// document at any time via the recorded steps (`Migration.getMigrationSteps`), so no
// separate durable intent is kept: each step's own `foldedAt` checkpoint is enough to
// make a re-run cheap and a crash between writes harmless (every fold is value-compare guarded). A
// marker holds a CHAIN of steps, one per `from -> to` boundary the object has
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
 * stored field on the step — see {@link Migration.MigrationStepSchema}'s `preHeads`).
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
 * The `lens`'s overlaid target properties whose overlay value changed between `base` and `current` —
 * an old client still lensing through it writes one into the object's annotation dictionary
 * (`meta.annotations[OverlayAnnotation.key][lens.id][property]`), a meta path the data-path diff
 * never sees. Compared by value, since an overlay write replaces the whole dictionary and so touches
 * every property's path.
 */
const lateOverlayWrites = (
  doc: AutomergeDoc<unknown>,
  mountPath: readonly (string | number)[],
  base: Heads,
  current: Heads,
  lensId: string,
  overlaid: ReadonlySet<string>,
): ReadonlySet<string> => {
  const overlayPath = [...mountPath, META_NAMESPACE, 'annotations', Lens.OverlayAnnotation.key, lensId];
  const atBase: unknown = getDeep(A.view(doc, base), overlayPath);
  const atCurrent: unknown = getDeep(A.view(doc, current), overlayPath);
  const valueOf = (overlay: unknown, property: string): unknown => (isRecord(overlay) ? overlay[property] : undefined);
  return new Set(
    [...overlaid].filter((property) => !encodedValuesEqual(valueOf(atBase, property), valueOf(atCurrent, property))),
  );
};

/**
 * The migration's data output for one snapshot of the object — `transform` is pure over the object's
 * own data, so re-running it is exactly what the migration would have written from that snapshot.
 */
const recomputeMigrationOutput = (
  migration: Migration.ObjectMigration,
  id: string,
  snapshot: Record<string, unknown>,
): { data: Record<string, unknown>; meta: Record<string, unknown> } => {
  const output = migration.transform({ ...snapshot, id });
  if (!isRecord(output)) {
    return { data: {}, meta: {} };
  }
  const { id: _id, ...data } = output;
  const meta: unknown = Reflect.get(output, MetaId);
  return { data, meta: isRecord(meta) ? meta : {} };
};

/** Each change's deps, by change hash. */
type ChangeGraph = Map<string, readonly string[]>;

/** `hashes` and every change they depend on. */
const ancestorsOf = (graph: ChangeGraph, hashes: Iterable<string>): Set<string> => {
  const seen = new Set<string>();
  const stack = [...hashes];
  for (let hash = stack.pop(); hash !== undefined; hash = stack.pop()) {
    if (!seen.has(hash)) {
      seen.add(hash);
      stack.push(...(graph.get(hash) ?? []));
    }
  }
  return seen;
};

/** The heads `hashes` span: each one no other of them depends on, sorted so equal sets compare equal. */
const frontierOf = (graph: ChangeGraph, hashes: Iterable<string>): Heads => {
  const unique = [...new Set(hashes)];
  const covered = ancestorsOf(
    graph,
    unique.flatMap((hash) => graph.get(hash) ?? []),
  );
  return unique.filter((hash) => !covered.has(hash)).sort();
};

/** Keys whose value differs between two outputs, including keys `next` clears. */
const movedOutputKeys = (
  core: ObjectCore,
  previous: Record<string, unknown>,
  next: Record<string, unknown>,
): string[] => [
  ...new Set([...Object.keys(changedOutputEntries(core, previous, next)), ...removedOutputKeys(previous, next)]),
];

/** A record that is a map in the document, not an encoded reference. */
const isMapValue = (value: unknown): value is Record<string, unknown> =>
  isRecord(value) && !isEncodedReference(value) && !(value instanceof A.RawString) && !(value instanceof Uint8Array);

/** Lists longer than this pair their differing middles by position instead of by a quadratic LCS. */
const LIST_DIFF_LIMIT = 250_000;

/** Index pairs of the longest common subsequence of `from` and `to`, by encoded value. */
const commonSubsequence = (from: readonly unknown[], to: readonly unknown[]): [number, number][] => {
  const rows = from.length;
  const columns = to.length;
  if (rows * columns > LIST_DIFF_LIMIT) {
    return [];
  }
  const lengths = Array.from({ length: rows + 1 }, () => new Array<number>(columns + 1).fill(0));
  for (let row = rows - 1; row >= 0; row--) {
    for (let column = columns - 1; column >= 0; column--) {
      lengths[row][column] = encodedValuesEqual(from[row], to[column])
        ? lengths[row + 1][column + 1] + 1
        : Math.max(lengths[row + 1][column], lengths[row][column + 1]);
    }
  }
  const pairs: [number, number][] = [];
  for (let row = 0, column = 0; row < rows && column < columns;) {
    if (encodedValuesEqual(from[row], to[column])) {
      pairs.push([row, column]);
      row++;
      column++;
    } else if (lengths[row + 1][column] >= lengths[row][column + 1]) {
      row++;
    } else {
      column++;
    }
  }
  return pairs;
};

/**
 * Edits the value at `path` in `draft` from `from` (its value there) into `to`, as nested edits rather
 * than one replacement: a map is updated key by key, a list by inserts and deletes around the elements
 * the two share, and a string by a text diff. A concurrent direct edit elsewhere in the same map, list
 * or text therefore survives the merge.
 */
const applyStructuralEdit = (draft: unknown, path: readonly (string | number)[], from: unknown, to: unknown): void => {
  if (encodedValuesEqual(from, to)) {
    return;
  }
  if (typeof from === 'string' && typeof to === 'string') {
    invariant(typeof draft === 'object' && draft !== null, 'fold draft is not a document');
    A.updateText(draft, [...path], to);
    return;
  }
  if (isMapValue(from) && isMapValue(to)) {
    const map = getDeep(draft, [...path]);
    invariant(isRecord(map), 'fold target is not a map');
    for (const key of Object.keys(from)) {
      if (!Object.hasOwn(to, key)) {
        delete map[key];
      }
    }
    for (const [key, value] of Object.entries(to)) {
      applyStructuralEdit(draft, [...path, key], from[key], value);
    }
    return;
  }
  if (Array.isArray(from) && Array.isArray(to)) {
    const list = getDeep(draft, [...path]);
    invariant(Array.isArray(list), 'fold target is not a list');
    // Shift from an index in `from` to the same element's index in the list being edited.
    let shift = 0;
    let fromIndex = 0;
    let toIndex = 0;
    for (const [fromMatch, toMatch] of [...commonSubsequence(from, to), [from.length, to.length]]) {
      const paired = Math.min(fromMatch - fromIndex, toMatch - toIndex);
      for (let offset = 0; offset < paired; offset++) {
        applyStructuralEdit(
          draft,
          [...path, fromIndex + offset + shift],
          from[fromIndex + offset],
          to[toIndex + offset],
        );
      }
      const removed = fromMatch - fromIndex - paired;
      const inserted = to.slice(toIndex + paired, toMatch);
      list.splice(fromIndex + paired + shift, removed, ...inserted);
      shift += inserted.length - removed;
      fromIndex = fromMatch + 1;
      toIndex = toMatch + 1;
    }
    return;
  }
  setDeep(draft, [...path], to);
};

/**
 * Folds each late change to a retired property as a change of its own, forked at the migration plus
 * the folds of that change's own late ancestors. Every input — the fork, the source snapshots before
 * and after the change, and so the edit — is a function of the source history alone, so peers that
 * receive the late changes in any order author byte-identical folds (`ObjectCore.foldChangeAt`), and a
 * list insert or text splice lands once. A change that edits inside a retired value is folded as edits
 * inside the target ({@link applyStructuralEdit}), so a direct edit elsewhere in the same value stays;
 * one that sets it outright is folded whole, and conflicts with a direct edit to the target.
 */
const foldLateChanges = (
  db: Database.Database,
  migration: Migration.ObjectMigration,
  step: Migration.MigrationStep,
  stepKey: string,
  object: Obj.Unknown,
  postMigrationHeads: Heads,
  base: Heads,
): void => {
  const core = getObjectCore(object);
  const mountPath = core.mountPath;
  const retired = new Set(step.retired);
  const scope = `${object.id}:${stepKey}`;
  const messagePrefix = `${foldMessage(step.from, step.to)} [${scope}] `;
  // An old client writes a kept property directly; folding its write as well would apply it twice.
  const kept = new Set(
    [
      ...SchemaEx.getProperties(migration.fromSchema.ast).map((property) => String(property.name)),
      ...Object.keys(getDecodedDataWithRefs(db, core, [...step.preHeads])),
    ].filter((key) => !retired.has(key)),
  );

  const doc = core.getDoc();
  const graph: ChangeGraph = new Map();
  const foldOf = new Map<string, string>();
  for (const change of A.getChangesMetaSince(doc, [])) {
    graph.set(change.hash, change.deps);
    if (change.message?.startsWith(messagePrefix)) {
      foldOf.set(change.message.slice(messagePrefix.length), change.hash);
    }
  }

  for (const change of A.getChangesMetaSince(doc, base)) {
    if (foldOf.has(change.hash) || change.message?.startsWith(messagePrefix)) {
      continue;
    }
    const before = frontierOf(graph, [...postMigrationHeads, ...change.deps]);
    const after = frontierOf(graph, [...postMigrationHeads, change.hash]);
    const writes = lateRetiredWrites(core.getDoc(), mountPath, before, after, retired);
    if (writes.size === 0) {
      continue;
    }
    // A late change that sets a retired property outright replaces it, as a property set does; one that
    // edits inside it (a list insert, a text splice) is folded as edits inside the target the same way.
    const replaces = [...writes.values()].some((patches) =>
      patches.some((patch) => patch.path.length === mountPath.length + 2),
    );

    const previous = recomputeMigrationOutput(migration, object.id, getDecodedDataWithRefs(db, core, before));
    const next = recomputeMigrationOutput(migration, object.id, getDecodedDataWithRefs(db, core, after));
    const dataKeys = movedOutputKeys(core, previous.data, next.data).filter((key) => !kept.has(key));
    const metaKeys = movedOutputKeys(core, previous.meta, next.meta);
    if (dataKeys.length === 0 && metaKeys.length === 0) {
      continue;
    }

    const lateAncestors = ancestorsOf(graph, change.deps);
    const fork = frontierOf(graph, [
      ...postMigrationHeads,
      ...[...foldOf].filter(([late]) => lateAncestors.has(late)).map(([, fold]) => fold),
    ]);
    const atFork: unknown = getDeep(A.view(core.getDoc(), fork), [...mountPath]);
    const nextData = mapRefsToEncodedReferences(next.data);
    const nextMeta = mapRefsToEncodedReferences(next.meta);
    const edits = [
      ...dataKeys.map((key) => ({ path: [DATA_NAMESPACE, key], value: nextData[key] })),
      ...metaKeys.map((key) => ({ path: [META_NAMESPACE, key], value: nextMeta[key] })),
    ].map(({ path, value }) => ({ path, value: value === undefined ? undefined : core.encode(value) }));

    const heads = core.foldChangeAt(
      fork,
      (draft, mountPath) => {
        for (const { path, value } of edits) {
          const fullPath = [...mountPath, ...path];
          if (value === undefined) {
            const parent = getDeep(draft, fullPath.slice(0, -1));
            if (isRecord(parent)) {
              delete parent[String(fullPath.at(-1))];
            }
          } else if (!replaces && path[0] === DATA_NAMESPACE) {
            applyStructuralEdit(draft, fullPath, getDeep(atFork, path), value);
          } else {
            setDeep(draft, fullPath, value);
          }
        }
      },
      {
        message: `${messagePrefix}${change.hash}`,
        actorSeed: JSON.stringify({ scope, late: change.hash, fork, replaces, edits }),
      },
    );
    if (heads) {
      const [fold] = heads;
      graph.set(fold, fork);
      foldOf.set(change.hash, fold);
    }
  }
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
const foldStep = (
  db: Database.Database,
  migration: Migration.ObjectMigration,
  step: Migration.MigrationStep,
  stepKey: string,
  object: Obj.Unknown,
): void => {
  const core = getObjectCore(object);
  const doc = core.getDoc();
  const mountPath = core.mountPath;

  if (!A.hasHeads(doc, [...step.preHeads])) {
    // A foreign frontier (e.g. an epoch re-root) — never fold on foreign heads (M0-REPORT.md design
    // item 8): `A.diff` against them would silently report "everything is new".
    log.warn('foldForward: skipping step with foreign migration heads', { object: object.id, stepKey });
    return;
  }

  const postMigrationHeads = findPostMigrationHeads(doc, step);
  if (!postMigrationHeads) {
    log.warn('foldForward: could not locate the migration change for step', { object: object.id, stepKey });
    return;
  }

  const base: Heads = step.foldedAt ? [...step.foldedAt] : postMigrationHeads;
  if (!A.hasHeads(doc, base)) {
    log.warn('foldForward: skipping step with a foreign fold checkpoint', { object: object.id, stepKey });
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

  if (lateWrites.size > 0) {
    foldLateChanges(db, migration, step, stepKey, object, postMigrationHeads, base);
  }

  // An overlay write is never part of the transform's input (it lives in meta, not data), so it is
  // folded from the object's CURRENT overlay value directly, whole-value, in one change per step.
  const overlayWrites = new Map<string, unknown>();
  if (migration.lens) {
    for (const property of overlayLateWrites) {
      const value = Lens.getOverlay(object, migration.lens.id, property);
      for (const [key, encoded] of computeGuardedDataWrites(core, { [property]: value })) {
        overlayWrites.set(key, encoded);
      }
    }
  }
  if (overlayWrites.size > 0) {
    core.foldAt(
      postMigrationHeads,
      (data) => {
        for (const [key, value] of overlayWrites) {
          data[key] = value;
        }
      },
      // Scoped to this object AND this step: a shared actor across steps (or objects) could otherwise
      // fork from a LATER step's fold, which itself already carries a direct edit made between the two
      // steps, and so wrongly inherit that edit as an ancestor instead of staying concurrent with it.
      { message: foldMessage(step.from, step.to), scope: `${object.id}:${stepKey}` },
    );
  }

  // Ordinary (non-fold) write: this is the runner's own bookkeeping, never user data. Checkpoints the
  // heads the diff above read; a crash before this lands just re-diffs a wider, value-compared
  // (harmless) range. Written directly at the step's own key, never
  // as a whole-marker (or whole-step) replace, so a sibling step's own checkpoint — or one a
  // concurrent peer is writing to a DIFFERENT step of the same marker — is never disturbed.
  const stepPath = [...mountPath, META_NAMESPACE, 'annotations', stepKey];
  const foldedAt = core.encode([...currentHeads]);
  core.change((doc) => {
    setDeep(doc, [...stepPath, 'foldedAt'], foldedAt);
  });
};

/**
 * Sets the type to the latest recorded step's target when the type register reads otherwise: peers
 * migrating concurrently to different versions write the type as a last-writer-wins register, but
 * every peer derives the same latest step.
 */
const repairMigratedType = (object: Obj.Unknown, steps: readonly Migration.RecordedMigrationStep[]): void => {
  const latest = steps.at(-1)?.step.to;
  if (latest === undefined || Obj.getTypeURI(object)?.toString() === latest) {
    return;
  }
  const core = getObjectCore(object);
  const typeRef = EncodedReference.fromURI(URI.make(latest));
  core.change((doc) => {
    setDeep(doc, [...core.mountPath, SYSTEM_NAMESPACE, 'type'], typeRef);
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
const foldObject = (db: Database.Database, migrations: readonly Migration.Migration[], object: Obj.Unknown): void => {
  const steps = Migration.getMigrationSteps(object);
  repairMigratedType(object, steps);
  for (const { key, step } of steps) {
    const migration = migrations.find(
      (candidate): candidate is Migration.ObjectMigration =>
        Migration.isObjectMigration(candidate) &&
        candidate.fromType.toString() === step.from &&
        candidate.toType.toString() === step.to,
    );
    if (!migration) {
      log.verbose('foldForward: no migration passed in for a recorded step, skipping it', {
        object: object.id,
        stepKey: key,
        from: step.from,
        to: step.to,
      });
      continue;
    }

    try {
      foldStep(db, migration, step, key, object);
    } catch (err) {
      log.warn('foldForward: failed to fold a migration step forward', { object: object.id, stepKey: key, err });
    }
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
const fanInFoldMessage = (fanInId: string, parentId: string): string => `fold: fan-in ${fanInId} -> ${parentId}`;

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
 */
const resolveFoldPatch = (
  parent: Obj.Unknown,
  patch: Record<string, unknown>,
  collision: Migration.CollisionPolicy,
  fromChild: ReadonlySet<string>,
): Record<string, unknown> => {
  const policyResolved = resolvePatch(parent, patch, collision).values;
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

  // Only keys whose absorbed value the late writes moved are folded, so a direct edit on the parent
  // is never overwritten on account of an unrelated child key.
  const patch = changedOutputEntries(
    parentCore,
    migration.absorb({ ...getDecodedDataWithRefs(db, core, base), id: child.id }),
    migration.absorb({ ...getDecodedDataWithRefs(db, core, currentHeads), id: child.id }),
  );
  const resolved = resolveFoldPatch(parent, patch, migration.collision, new Set(marker.fromChild));
  const dataWrites = computeGuardedDataWrites(parentCore, resolved);

  if (dataWrites.size > 0) {
    parentCore.foldAt(
      [...marker.absorbedAtParentHeads],
      (data) => {
        for (const [key, value] of dataWrites) {
          data[key] = value;
        }
      },
      { message: fanInFoldMessage(migration.id, marker.parentId), scope: `fan-in:${child.id}` },
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

/** Folds `object` with the fan-in that absorbed it, if it is an absorbed child. */
const foldFanInObject = async (
  db: Database.Database,
  fanIns: readonly Migration.FanInMigration[],
  object: Obj.Unknown,
): Promise<void> => {
  const markerOption = Annotation.get(object, Migration.FanInMarkerAnnotation);
  if (Option.isNone(markerOption)) {
    return;
  }
  const marker = markerOption.value;
  const migration = fanIns.find((candidate) => marker.migration === fanInAbsorbMessage(candidate.id, marker.parentId));
  if (migration) {
    await foldFanInChild(db, migration, object, marker);
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
 * Points `toProperty[elementId]` at `child` unless it already does. A map entry, so two peers adding the
 * same late element write the same key rather than appending two refs.
 */
const setArrayFanOutRef = (parent: Obj.Unknown, toProperty: string, elementId: string, child: Obj.Unknown): void => {
  // Element ids are not valid JSON-path segments, so the record is indexed directly.
  const refs: unknown = Obj.getValue(parent, [toProperty]);
  const current = isRecord(refs) ? refs[elementId] : undefined;
  if (Ref.isRef(current) && Ref.hasEntityId(child.id)(current)) {
    return;
  }
  Obj.update(parent, (parent) => {
    if (!isRecord(Obj.getValue(parent, [toProperty]))) {
      Obj.setValue(parent, [toProperty], {});
    }
    const record: unknown = Obj.getValue(parent, [toProperty]);
    if (isRecord(record)) {
      record[elementId] = Ref.make(child);
    }
  });
};

/** One element of a source array snapshot, with its position. */
type ArrayElement = { element: Record<string, unknown>; index: number };

/**
 * The id'd elements of `property` in a data snapshot, by element id. An id held by more than one
 * element is left out (it would collapse two elements into one child); `missingIds` counts the rest.
 */
const elementsById = (
  data: Record<string, unknown>,
  property: string,
  elementId: string,
): { elements: Map<string, ArrayElement>; missingIds: number } => {
  const elements = new Map<string, ArrayElement>();
  let missingIds = 0;
  const duplicates = new Set<string>();
  const items = data[property];
  if (Array.isArray(items)) {
    items.forEach((element: unknown, index: number) => {
      const id = isRecord(element) ? element[elementId] : undefined;
      if (!isRecord(element) || typeof id !== 'string') {
        missingIds++;
      } else if (elements.has(id)) {
        duplicates.add(id);
      } else {
        elements.set(id, { element, index });
      }
    });
  }
  for (const id of duplicates) {
    elements.delete(id);
  }
  return { elements, missingIds };
};

/**
 * Folds one element of the source array forward into its child: only the child keys whose `toChild`
 * output the late writes moved, at the child's creation heads, so a direct edit to the child stays
 * concurrent. An element with no child yet (added by an old client after the split) gets one, and
 * its ref. Never throws: a child with underivable creation heads is logged and left for the next pass.
 */
const foldArrayFanOutElement = async (
  db: Database.Database,
  migration: Migration.ArrayFanOutMigration,
  parent: Obj.Unknown,
  elementId: string,
  before: Record<string, unknown> | undefined,
  after: Record<string, unknown>,
  childCache: ConvergenceKeyCache,
): Promise<void> => {
  const convergenceKey = Migration.makeArrayFanOutConvergenceKey(
    migration.fromType.toString(),
    parent.id,
    migration.childRole ?? migration.property,
    elementId,
  );
  const existingChild = await findByConvergenceKey(db, migration.child, convergenceKey, childCache);
  if (existingChild && getObjectCore(existingChild).isDeleted()) {
    return; // Deleted in the new shape; a late source write must not bring it back.
  }
  if (!existingChild) {
    // Only an element added since the checkpoint gets a new child.
    if (!before) {
      const child = await ensureByConvergenceKey(db, migration.child, convergenceKey, after, childCache);
      setArrayFanOutRef(parent, migration.toProperty, elementId, child);
    }
    return;
  }
  if (!before) {
    setArrayFanOutRef(parent, migration.toProperty, elementId, existingChild);
  }

  const childCore = getObjectCore(existingChild);
  const dataWrites = computeGuardedDataWrites(
    childCore,
    before ? changedOutputEntries(childCore, before, after) : after,
  );
  const deletions = before
    ? removedOutputKeys(before, after).filter((key) => childCore.getRaw([DATA_NAMESPACE, key]) !== undefined)
    : [];
  if (dataWrites.size === 0 && deletions.length === 0) {
    return;
  }
  const creationHeads = deriveChildCreationHeads(childCore);
  if (!creationHeads) {
    log.warn('foldForward: could not derive creation heads for an array fan-out child', { child: existingChild.id });
    return;
  }
  childCore.foldAt(
    creationHeads,
    (data) => {
      for (const [key, value] of dataWrites) {
        data[key] = value;
      }
      for (const key of deletions) {
        delete data[key];
      }
    },
    {
      message: arrayFanOutFoldMessage(migration.fromType.toString(), migration.toType.toString()),
      scope: `array-fan-out:${parent.id}:${elementId}`,
    },
  );
};

/**
 * Folds one split parent's source array forward if it changed since the split (or the last fold):
 * each current id'd element whose `toChild` output moved is folded into its child, and a new one gets
 * a child. An element with no id yet is left for the next stamping pass; a removed element's child is
 * left for {@link Migration.findOrphanedChildren}. `marker` is this migration's own property's marker.
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
  if (!hasLateArrayWrites(doc, mountPath, marker.property, base, currentHeads)) {
    return;
  }

  const before = elementsById(getDecodedDataWithRefs(db, core, base), marker.property, marker.elementId).elements;
  const { elements: after, missingIds } = elementsById(
    getDecodedDataWithRefs(db, core, currentHeads),
    marker.property,
    marker.elementId,
  );
  if (missingIds > 0) {
    log.info('foldForward: array fan-out elements have no stable id yet, leaving them for the stamping migration', {
      parent: parent.id,
      missingIds,
    });
  }
  // One durable query per parent-fold, shared across its elements.
  const childCache: ConvergenceKeyCache = new Map();
  for (const [elementId, { element, index }] of after) {
    // Concurrent stamps that disagree would give two peers two different children.
    if (hasUnresolvedIdConflict(parent, marker.property, index, marker.elementId)) {
      continue;
    }
    const previous = before.get(elementId);
    await foldArrayFanOutElement(
      db,
      migration,
      parent,
      elementId,
      previous && migration.toChild(previous.element, previous.index),
      migration.toChild(element, index),
      childCache,
    );
  }

  // Ordinary (non-fold) write under this property's own marker key, at the heads the pass read.
  const markerPath = [
    ...mountPath,
    META_NAMESPACE,
    'annotations',
    Migration.ArrayFanOutMarkerAnnotation.key,
    marker.property,
  ];
  const foldedAt = core.encode([...currentHeads]);
  core.change((doc) => {
    setDeep(doc, [...markerPath, 'foldedAt'], foldedAt);
  });
};

/** Folds each array property `object` split, with the array fan-out that split it. */
const foldArrayFanOutObject = async (
  db: Database.Database,
  arrayFanOuts: readonly Migration.ArrayFanOutMigration[],
  object: Obj.Unknown,
): Promise<void> => {
  const markersOption = Annotation.get(object, Migration.ArrayFanOutMarkerAnnotation);
  if (Option.isNone(markersOption)) {
    return;
  }
  for (const [property, marker] of Object.entries(markersOption.value)) {
    const migration = arrayFanOuts.find(
      (candidate) => candidate.property === property && marker.migration === arrayFanOutSplitMessage(candidate),
    );
    if (migration) {
      await foldArrayFanOutParent(db, migration, object, marker);
    }
  }
};

/** Options for {@link foldForwardMigrations}. */
export type FoldForwardOptions = {
  /** Restricts the pass to these objects, so an update-triggered pass skips unchanged history. */
  objectIds?: ReadonlySet<string>;
};

/**
 * Folds every late old-shape write forward — see {@link foldObject}, {@link foldFanInChild} and
 * {@link foldArrayFanOutParent}. Objects are found by the markers they carry, not by type, so an object
 * a later migration moved on (or a tombstoned fan-in child) still folds. Never throws for one object: it
 * is logged and left for the next pass.
 */
export const foldForwardMigrations = async (
  db: Database.Database,
  migrations: Migration.Migration[],
  options: FoldForwardOptions = {},
): Promise<void> => {
  const ids = options.objectIds && [...options.objectIds].filter((id) => EntityId.isValid(id));
  if (ids?.length === 0) {
    return;
  }
  const objects: Obj.Unknown[] = await db
    .query(Query.select(ids ? Filter.id(...ids) : Filter.everything()).options({ deleted: 'include' }))
    .run();
  const fanIns = migrations.filter(Migration.isFanInMigration);
  const arrayFanOuts = migrations.filter(Migration.isArrayFanOutMigration);
  for (const object of objects) {
    foldObject(db, migrations, object);
    try {
      await foldFanInObject(db, fanIns, object);
    } catch (err) {
      log.warn('foldForward: failed to fold a fan-in child forward', { object: object.id, err });
    }
    try {
      await foldArrayFanOutObject(db, arrayFanOuts, object);
    } catch (err) {
      log.warn('foldForward: failed to fold an array fan-out parent forward', { object: object.id, err });
    }
  }
};
