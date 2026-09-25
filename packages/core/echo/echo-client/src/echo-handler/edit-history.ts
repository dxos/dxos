//
// Copyright 2024 DXOS.org
//

import { next as A, type Doc, type Heads, type Prop, type State } from '@automerge/automerge';

import { type Change, Obj } from '@dxos/echo';
import { EntityStructure } from '@dxos/echo-protocol';
import { ATTR_META, ATTR_TYPE } from '@dxos/echo/internal';
import { assertArgument } from '@dxos/invariant';
import { getDeep } from '@dxos/util';

import { ObjectCore } from '../core-db/index.ts';
import { initEchoReactiveObjectRootProxy } from './echo-handler.ts';
import { getObjectCore, isEchoObject } from './echo-object-utils.ts';

/**
 * Returns the edit history of an ECHO object.
 * NOTE: This is the history of the automerge document containing the echo object.
 */
// TODO(burdon): Also Relation?
export const getEditHistory = (object: Obj.Unknown): State<any>[] => {
  assertArgument(isEchoObject(object), 'expected ECHO object stored in the database');

  const objectCore = getObjectCore(object);
  const doc = objectCore.getDoc();
  const changes = A.getHistory(doc as Doc<any>);
  return changes;
};

/**
 * A single point in an object's edit history annotated with the magnitude of the change.
 * Magnitudes are intentionally unitless ("changes"): text edits contribute character counts
 * while scalar field sets contribute one each, so callers should not treat them as characters.
 */
export type VersionDiff = {
  /** Cumulative automerge frontier identifying this version (all changes up to and including it). */
  heads: Heads;
  /** Wall-clock time of the change in epoch milliseconds. */
  time: number;
  /** Opaque automerge actor id that authored the change. */
  actor: string;
  /** Optional commit message. */
  message?: string;
  /** Number of additions introduced relative to the previous version. */
  added: number;
  /** Number of deletions introduced relative to the previous version. */
  removed: number;
};

/**
 * Returns the object's edit history with per-version add/remove magnitudes, suitable for a
 * timeline visualization. Magnitudes are derived from automerge patches between consecutive
 * versions; the first version is diffed against the empty document so it counts as all-additions.
 *
 * Each version's `heads` is the cumulative frontier of all changes up to and including that point,
 * not the single change hash. A bare change hash is not a usable version identifier once history
 * branches (concurrent edits or merges): `A.view` at one branch tip omits the other branch's
 * content, so reconstructing a version would drop edits made on a sibling branch. Replaying the
 * changes in topological order and reading the frontier after each yields heads that round-trip
 * through `A.view`/`checkoutVersion` regardless of branching.
 */
export const getEditHistoryWithDiffs = (object: Obj.Unknown): VersionDiff[] => {
  assertArgument(isEchoObject(object), 'object', 'expected ECHO object stored in the database');

  const objectCore = getObjectCore(object);
  const doc = objectCore.getDoc() as Doc<any>;
  const history = A.getHistory(doc);
  const changes = A.getAllChanges(doc);

  let accumulator = A.init<any>();
  let before: Heads = [];
  return history.map((state, index): VersionDiff => {
    const { change } = state;
    [accumulator] = A.applyChanges(accumulator, [changes[index]]);
    const after = A.getHeads(accumulator);
    const patches = A.diff(doc, before, after);
    before = after;

    let added = 0;
    let removed = 0;
    for (const patch of patches) {
      switch (patch.action) {
        case 'splice':
          // Text insertion: `value` is the inserted string.
          added += patch.value.length;
          break;
        case 'insert':
          // List/text insertion: count elements (or characters for string elements).
          for (const value of patch.values) {
            added += typeof value === 'string' ? value.length : 1;
          }
          break;
        case 'del':
          // `length` is absent for single-element deletions.
          removed += patch.length ?? 1;
          break;
        case 'put':
        case 'inc':
          // Scalar set / counter bump counts as one change.
          added += 1;
          break;
        default:
          // mark / unmark / conflict carry no magnitude.
          break;
      }
    }

    return {
      heads: after,
      // Automerge stores change time in epoch seconds.
      time: change.time * 1000,
      actor: change.actor,
      message: change.message ?? undefined,
      added,
      removed,
    };
  });
};

/**
 * @returns Raw object data at the given version.
 */
// TODO(burdon): Also Relation?
// TODO(dmaretskyi): Hydrate the object
export const checkoutVersion = (object: Obj.Unknown, version: Heads): unknown => {
  assertArgument(isEchoObject(object), 'object', 'expected ECHO object stored in the database');
  assertArgument(Array.isArray(version), 'version', 'expected automerge heads array');

  const objectCore = getObjectCore(object);
  const doc = objectCore.getDoc();
  const snapshot = A.view(doc as Doc<any>, version);

  // TODO(dmaretskyi): Refactor so this doesn't have to create another core.
  const versionCore = new ObjectCore();
  versionCore.id = objectCore.id;
  versionCore.doc = snapshot;
  versionCore.mountPath = objectCore.mountPath;

  const structure: EntityStructure | undefined = getDeep(snapshot, [...objectCore.mountPath]);

  // TODO(dmaretskyi): Fix this nonsense.
  return {
    id: objectCore.id,
    [ATTR_TYPE]: structure && EntityStructure.getTypeReference(structure)?.['/'],
    [ATTR_META]: structure?.meta,
    ...(structure && structure.data),
  } as any;
};

/**
 * @returns An immutable {@link Obj.Snapshot} of the object at the given historical heads — a detached
 * instance, not a pin on the live object. Every surface that wants the historical value renders this
 * snapshot; the live object is unaffected (nothing else in the app rewinds).
 */
export const checkoutVersionSnapshot = <T extends Obj.Unknown>(object: T, version: Heads): Obj.Snapshot<T> => {
  assertArgument(isEchoObject(object), 'object', 'expected ECHO object stored in the database');
  assertArgument(Array.isArray(version), 'version', 'expected automerge heads array');

  const objectCore = getObjectCore(object);
  return snapshotAt<T>(objectCore, A.view(objectCore.getDoc() as Doc<any>, version));
};

/**
 * @returns The object's history, oldest first: one entry per change to its document that touched the
 * object (or, given `property`, that property), with the value before and after — see `Obj.getChanges`.
 *
 * Each change is diffed against the cumulative frontier of the changes before it in topological order
 * (as in {@link getEditHistoryWithDiffs}), so a change made concurrently with another still reports
 * exactly its own effect, and its `heads` round-trip through `Obj.getVersion`.
 */
export const getObjectChanges = <T extends Obj.Unknown>(
  object: T,
  opts: Obj.GetChangesOptions = {},
): Change.ValueChange<unknown>[] => {
  assertArgument(isEchoObject(object), 'object', 'expected ECHO object stored in the database');
  const { property } = opts;
  const objectCore = getObjectCore(object);
  const doc = objectCore.getDoc() as Doc<any>;
  const mountPath = [...objectCore.mountPath];
  const target: Prop[] = property === undefined ? mountPath : [...mountPath, 'data', property];

  const readValue = (heads: Heads): unknown => {
    if (heads.length === 0) {
      return undefined;
    }
    const historical = A.view(doc, heads);
    if (getDeep(historical, mountPath) == null) {
      return undefined;
    }
    const snapshot = snapshotAt<T>(objectCore, historical);
    return property === undefined ? snapshot : Reflect.get(snapshot, property);
  };

  const changes: Change.ValueChange<unknown>[] = [];
  let frontier: Heads = [];
  for (const meta of A.getChangesMetaSince(doc, [])) {
    const previous = frontier;
    frontier = [...previous.filter((hash) => !meta.deps.includes(hash)), meta.hash].sort();
    if (!A.diff(doc, previous, frontier).some((patch) => overlaps(patch.path, target))) {
      continue;
    }

    const before = readValue(previous);
    const after = readValue(frontier);
    // A write to an ancestor (e.g. the document's first change creating the object map) overlaps
    // the target path without changing the value there.
    if (before === after) {
      continue;
    }

    changes.push(
      Object.freeze({
        key: meta.hash,
        source: 'document',
        // Automerge stores change time in epoch seconds.
        time: meta.time * 1000,
        actor: meta.actor,
        seq: meta.seq,
        ops: meta.maxOp - meta.startOp + 1,
        object: objectCore.id,
        ...(property !== undefined && { property }),
        heads: Object.freeze(frontier),
        ...(meta.message != null && { message: meta.message }),
        before,
        after,
      }),
    );
  }

  return changes;
};

/** Reconstructs the object over a historical view of its document as an immutable snapshot. */
const snapshotAt = <T extends Obj.Unknown>(objectCore: ObjectCore, historical: Doc<any>): Obj.Snapshot<T> => {
  // The core is transient — it exists only to produce the snapshot.
  const versionCore = new ObjectCore();
  versionCore.id = objectCore.id;
  versionCore.doc = historical;
  versionCore.mountPath = objectCore.mountPath;
  const proxy = initEchoReactiveObjectRootProxy(versionCore) as T;
  return Obj.getSnapshot(proxy);
};

/** Whether a patch at `path` can change the value at `target`: one path is a prefix of the other. */
const overlaps = (path: readonly Prop[], target: readonly Prop[]): boolean => {
  const length = Math.min(path.length, target.length);
  for (let index = 0; index < length; index++) {
    if (path[index] !== target[index]) {
      return false;
    }
  }
  return true;
};
