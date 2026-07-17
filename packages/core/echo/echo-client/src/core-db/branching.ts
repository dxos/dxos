//
// Copyright 2026 DXOS.org
//

import { next as A, type Doc, type Heads } from '@automerge/automerge';

import { EncodedReference, EntityStructure } from '@dxos/echo-protocol';
import { invariant } from '@dxos/invariant';
import { EID } from '@dxos/keys';

/**
 * Device-local, non-synced persistence for the current-branch selection of a single space.
 * The current branch a device views an object on must survive a client reload but never replicate
 * to peers, so it is stored outside the synced documents. Provided by the embedding layer (the
 * browser client backs it with the worker's metadata store; tests back it with a per-peer store).
 */
export interface BranchStore {
  /** Load the persisted selections: object id -> branch name (`'main'` is omitted). */
  load(): Promise<Record<string, string>>;
  /** Persist the full current selection map (replacing any prior value). */
  save(entries: Record<string, string>): Promise<void>;
}

/**
 * Serialize an object's document into a branch fork. Forking via `A.save`/`A.load` (the `repo.import`
 * path) preserves the source's change ancestry, so the branch shares history with the main document
 * and `A.merge` later is a true CRDT 3-way merge rather than an unrelated "two roots" conflict.
 *
 * @param atHeads If provided, fork from this historical frontier instead of the tip. The frontier is
 * reached by replaying the source's changes onto a fresh document until the accumulator's heads
 * match (the same technique as `getEditHistoryWithDiffs`); `A.save(A.view(...))` cannot be used as it
 * serializes the full underlying history regardless of the view's heads.
 */
export const forkDump = (sourceDoc: Doc<any>, atHeads?: Heads): Uint8Array => {
  if (!atHeads) {
    return A.save(sourceDoc);
  }
  const target = new Set(atHeads);
  let forked = A.init<any>();
  let reached = false;
  for (const change of A.getAllChanges(sourceDoc)) {
    [forked] = A.applyChanges(forked, [change]);
    const heads = A.getHeads(forked);
    if (heads.length === atHeads.length && heads.every((hash) => target.has(hash))) {
      reached = true;
      break;
    }
  }
  // An unreachable frontier (heads from a different doc, e.g. a branch doc) would otherwise
  // silently fork at the tip with wrong provenance.
  invariant(reached, 'fork frontier not reachable in the source document');
  return A.save(forked);
};

/**
 * @returns The local ECHO object ids referenced from the object's data section. Used to walk a
 * subtree so branching forks the whole referenced tree (e.g. a document and its text child).
 */
export const referencedObjectIds = (structure: EntityStructure): string[] => {
  const ids: string[] = [];
  for (const { reference } of EntityStructure.getAllOutgoingReferences(structure)) {
    const eid = EID.tryParse(EncodedReference.toURI(reference));
    if (eid && EID.isLocal(eid)) {
      const id = EID.getEntityId(eid);
      if (id) {
        ids.push(id);
      }
    }
  }
  return ids;
};
