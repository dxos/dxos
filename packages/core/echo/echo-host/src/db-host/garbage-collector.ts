//
// Copyright 2026 DXOS.org
//

import { type AutomergeUrl, type DocumentId, interpretAsDocumentId } from '@automerge/automerge-repo';

import { type Context } from '@dxos/context';
import { DatabaseDirectory, EntityStructure } from '@dxos/echo-protocol';
import { type SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';

import { type AutomergeHost } from '../automerge';
import { type DatabaseRoot } from './database-root';
import { allSpaceDocumentIds, collectSpaceDocuments } from './space-storage';

export type GarbageCollectorDeps = {
  ctx: Context;
  spaceId: SpaceId;
  root: DatabaseRoot;
  automergeHost: AutomergeHost;
};

/**
 * The automerge storage reclaimed by a pass, in the shape the index-cleanup step consumes.
 */
export type SpaceGarbageCollectionResult = {
  /** Object ids unlinked from the space directory (inlined deletions + removed links). */
  unlinkedObjects: number;
  /** Documents wiped from storage. */
  wipedDocumentIds: DocumentId[];
  /** Objects removed from surviving documents (inlined deletions in the root). */
  removedInlineObjects: { documentId: string; objectId: string }[];
};

/**
 * Per-space garbage collection, steps 1–2. See `docs/GARBAGE_COLLECTION.md` for the full algorithm
 * and its safety invariants: unlink soft-deleted objects from the space directory, then wipe every
 * document owned by the space that is no longer reachable from the (post-unlink) directory.
 *
 * Index (step 5) and feed (steps 3–4) reclamation are layered in by the host from this result.
 */
export const runSpaceGarbageCollection = async (deps: GarbageCollectorDeps): Promise<SpaceGarbageCollectionResult> => {
  const { ctx, spaceId, root, automergeHost } = deps;

  const { unlinkedObjects, removedInlineObjects } = await unlinkDeletedObjects(deps);

  // Reachability is computed AFTER unlinking, so the just-unlinked documents fall out of the set
  // and are wiped below.
  const reachable = allSpaceDocumentIds(collectSpaceDocuments(root));

  const wipedDocumentIds: DocumentId[] = [];
  for await (const { documentId } of automergeHost.listDocumentHeads()) {
    if (reachable.has(documentId)) {
      continue;
    }
    // Attribution boundary: only wipe a document we can positively attribute to this space. A
    // document we cannot load (offline) or that carries no owner is left untouched.
    const handle = await automergeHost.loadDoc<DatabaseDirectory>(ctx, documentId, { fetchFromNetwork: false });
    const doc = handle?.doc();
    if (!doc) {
      continue;
    }
    const owner = await DatabaseDirectory.getSpaceId(doc);
    if (owner !== spaceId) {
      continue;
    }
    await automergeHost.removeDocument(documentId);
    wipedDocumentIds.push(documentId);
    log('gc: wiped orphaned document', { spaceId, documentId });
  }

  return { unlinkedObjects, wipedDocumentIds, removedInlineObjects };
};

/**
 * Step 1: remove soft-deleted objects from the space directory — deleted inlined objects are
 * dropped from the root document; deleted linked objects (and links dangling to a missing document)
 * have their `links` entry removed, orphaning the document for step 2.
 */
const unlinkDeletedObjects = async (
  deps: GarbageCollectorDeps,
): Promise<{ unlinkedObjects: number; removedInlineObjects: { documentId: string; objectId: string }[] }> => {
  const { ctx, root, automergeHost } = deps;
  const rootDoc = root.doc();
  if (!rootDoc) {
    return { unlinkedObjects: 0, removedInlineObjects: [] };
  }

  const deletedInlineIds = Object.entries(rootDoc.objects ?? {})
    .filter(([, object]) => EntityStructure.isDeleted(object as EntityStructure))
    .map(([id]) => id);

  const deletedLinkIds: string[] = [];
  for (const [objectId, url] of Object.entries(rootDoc.links ?? {})) {
    const documentId = interpretAsDocumentId(url.toString() as AutomergeUrl);
    const handle = await automergeHost.loadDoc<DatabaseDirectory>(ctx, documentId, { fetchFromNetwork: false });
    const doc = handle?.doc();
    if (!doc) {
      // Link points to a document that is not on disk — drop the dangling pointer.
      deletedLinkIds.push(objectId);
      continue;
    }
    const object = doc.objects?.[objectId];
    if (object && EntityStructure.isDeleted(object)) {
      deletedLinkIds.push(objectId);
    }
  }

  if (deletedInlineIds.length === 0 && deletedLinkIds.length === 0) {
    return { unlinkedObjects: 0, removedInlineObjects: [] };
  }

  root.handle.change((draft: DatabaseDirectory) => {
    for (const id of deletedInlineIds) {
      if (draft.objects) {
        delete draft.objects[id];
      }
    }
    for (const id of deletedLinkIds) {
      if (draft.links) {
        delete draft.links[id];
      }
    }
  });

  return {
    unlinkedObjects: deletedInlineIds.length + deletedLinkIds.length,
    removedInlineObjects: deletedInlineIds.map((objectId) => ({ documentId: root.documentId, objectId })),
  };
};
