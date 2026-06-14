//
// Copyright 2026 DXOS.org
//

import { type Heads } from '@automerge/automerge';
import * as Atom from '@effect-atom/atom/Atom';

import { type Obj } from '@dxos/echo';
import { assertArgument, invariant } from '@dxos/invariant';

import { type CoreDatabase } from '../core-db';
import { getObjectCore } from './echo-handler';
import { isEchoObject } from './echo-object-utils';

const resolve = (obj: Obj.Unknown): { db: CoreDatabase; id: string } => {
  assertArgument(isEchoObject(obj), 'obj', 'expected ECHO object stored in the database');
  const core = getObjectCore(obj);
  invariant(core.database, 'object is not bound to a database');
  return { db: core.database, id: core.id };
};

/**
 * @returns The branch names available for the object, including the implicit `'main'` (always first).
 */
export const getBranches = (obj: Obj.Unknown): string[] => {
  const { db, id } = resolve(obj);
  return db.listBranches(id);
};

/**
 * @returns The branch this device currently views the object on (`'main'` by default).
 */
export const getCurrentBranch = (obj: Obj.Unknown): string => {
  const { db, id } = resolve(obj);
  return db.getCurrentBranch(id);
};

/**
 * @returns Latest edit time (epoch ms) per branch, keyed by branch name (including `'main'`). The
 *   activity of a branch is the most recent automerge change across its whole subtree, so it is the
 *   meaningful "last updated" signal for ordering branches by recency. Loads branch docs as needed.
 */
export const getBranchActivity = (obj: Obj.Unknown): Promise<Record<string, number>> => {
  const { db, id } = resolve(obj);
  return db.getBranchActivity(id);
};

/**
 * Read the object's data on a specific branch WITHOUT switching to it (read-only). Used to fetch the
 * "other side" of a branch diff — e.g. a document's text content on another branch. Returns the
 * decoded data section (or undefined if the object has no document on that branch).
 */
export const getObjectOnBranch = (obj: Obj.Unknown, branchName: string): Promise<Record<string, any> | undefined> => {
  const { db, id } = resolve(obj);
  return db.getObjectStructureOnBranch(id, branchName).then((structure) => structure?.data);
};

/**
 * Fork the object and its referenced subtree into a new branch (does not switch to it).
 * @param opts.fromHeads Fork from a historical version (e.g. a scrubbed point) instead of the tip.
 *   A `Heads` array forks only the root; a `{ objectId -> Heads }` map forks each subtree member
 *   from its own frontier (use this to capture a scrubbed position across the whole subtree).
 */
export const createBranch = (
  obj: Obj.Unknown,
  name: string,
  opts?: { fromHeads?: Heads | Record<string, Heads> },
): Promise<void> => {
  const { db, id } = resolve(obj);
  return db.createBranch(id, name, opts);
};

/**
 * Switch the object's subtree to a branch (or back to `'main'`). Device-local; cascades to children.
 */
export const switchBranch = (obj: Obj.Unknown, name: string): Promise<void> => {
  const { db, id } = resolve(obj);
  return db.switchBranch(id, name);
};

/**
 * Merge a branch back into main across the subtree, then switch back to main.
 */
export const mergeBranch = (obj: Obj.Unknown, name: string, opts?: { deleteAfter?: boolean }): Promise<void> => {
  const { db, id } = resolve(obj);
  return db.mergeBranch(id, name, opts);
};

/**
 * Delete a branch (its documents lose their sync reference). Cannot delete `'main'`.
 */
export const deleteBranch = (obj: Obj.Unknown, name: string): void => {
  const { db, id } = resolve(obj);
  db.deleteBranch(id, name);
};

export type BranchState = {
  /** Available branch names, including the implicit `'main'` (always first). */
  branches: string[];
  /** The branch this device currently views the object on. */
  current: string;
};

/**
 * Reactive atom of an object's branch state (list + current selection). Recomputes on any branch
 * operation — including create/delete, which mutate the space root rather than the object itself —
 * so UIs stay in sync without manual refresh.
 */
const branchStateFamily = Atom.family((obj: Obj.Unknown) =>
  Atom.make<BranchState>((get) => {
    const { db, id } = resolve(obj);
    const compute = (): BranchState => ({ branches: db.listBranches(id), current: db.getCurrentBranch(id) });
    const unsubscribe = db.branchesChanged.on(() => get.setSelf(compute()));
    get.addFinalizer(() => unsubscribe());
    return compute();
  }).pipe(Atom.keepAlive),
);

export const branchStateAtom = (obj: Obj.Unknown): Atom.Atom<BranchState> => branchStateFamily(obj);
