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
 * @param atHeads If provided, fork from this historical frontier instead of the tip. The fork is
 * built from the ancestor closure of `atHeads` (via change dependency metadata) — a linear replay
 * of the full history can interleave concurrent siblings before the frontier and never reproduce
 * it exactly. `A.save(A.view(...))` cannot be used either, as it serializes the full underlying
 * history regardless of the view's heads. Heads not present in the source document (e.g. heads of
 * a different doc) throw rather than silently forking at the tip with wrong provenance.
 */
export const forkDump = (sourceDoc: Doc<any>, atHeads?: Heads): Uint8Array => {
  if (!atHeads) {
    return A.save(sourceDoc);
  }
  const decoded = A.getAllChanges(sourceDoc).map((change) => ({ change, meta: A.decodeChange(change) }));
  const byHash = new Map(decoded.map((entry) => [entry.meta.hash, entry]));
  const include = new Set<string>();
  const queue = [...atHeads];
  while (queue.length > 0) {
    const hash = queue.pop()!;
    if (include.has(hash)) {
      continue;
    }
    const entry = byHash.get(hash);
    invariant(entry, 'fork frontier not reachable in the source document');
    include.add(hash);
    queue.push(...entry.meta.deps);
  }
  // The filtered subset preserves the source's topological order, so dependencies apply first.
  let forked = A.init<any>();
  [forked] = A.applyChanges(
    forked,
    decoded.filter(({ meta }) => include.has(meta.hash)).map(({ change }) => change),
  );
  const heads = A.getHeads(forked);
  invariant(
    heads.length === atHeads.length && heads.every((hash) => atHeads.includes(hash)),
    'fork frontier not reachable in the source document',
  );
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
