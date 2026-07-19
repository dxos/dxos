//
// Copyright 2024 DXOS.org
//

import { next as A, type Doc, type Heads, type State } from '@automerge/automerge';

import { Obj } from '@dxos/echo';
import { EntityStructure } from '@dxos/echo-protocol';
import { ATTR_META, ATTR_TYPE } from '@dxos/echo/internal';
import { assertArgument } from '@dxos/invariant';
import { getDeep } from '@dxos/util';

import { ObjectCore } from '../core-db';
import { getObjectCore, initEchoReactiveObjectRootProxy } from './echo-handler';
import { isEchoObject } from './echo-object-utils';

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
  const historical = A.view(objectCore.getDoc() as Doc<any>, version);

  // Reconstruct the object over the historical doc in a detached core, then brand it as an immutable
  // snapshot. The core is transient — it exists only to produce the snapshot.
  const versionCore = new ObjectCore();
  versionCore.id = objectCore.id;
  versionCore.doc = historical;
  versionCore.mountPath = objectCore.mountPath;
  const proxy = initEchoReactiveObjectRootProxy(versionCore) as T;
  return Obj.getSnapshot(proxy);
};
