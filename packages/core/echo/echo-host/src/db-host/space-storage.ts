//
// Copyright 2026 DXOS.org
//

import { type AutomergeUrl, type DocumentId, interpretAsDocumentId } from '@automerge/automerge-repo';

import { type Context } from '@dxos/context';
import { DatabaseDirectory, EntityStructure } from '@dxos/echo-protocol';

import { type AutomergeHost } from '../automerge';
import { type DatabaseRoot } from './database-root';

/**
 * Per-space view of the automerge documents that make up a space directory.
 *
 * Shared by `stats()` and `runGarbageCollection()` — both walk the space directory the same way.
 * See `docs/GARBAGE_COLLECTION.md`.
 */
export type SpaceDocumentSet = {
  /** The space root document id. */
  rootDocumentId: DocumentId;
  /** Document ids that embed objects (root inlined objects live in the root document itself). */
  linkedDocumentIds: DocumentId[];
  /** Branch member document ids (occupy storage but are not object-link targets). */
  branchDocumentIds: DocumentId[];
};

const toDocumentId = (url: AutomergeUrl | string): DocumentId => interpretAsDocumentId(url as AutomergeUrl);

/**
 * Enumerate the documents reachable from a space root (root + object links + branch members).
 * Requires the root document to be loaded.
 */
export const collectSpaceDocuments = (root: DatabaseRoot): SpaceDocumentSet => {
  const doc = root.doc();
  if (!doc) {
    return { rootDocumentId: root.documentId, linkedDocumentIds: [], branchDocumentIds: [] };
  }

  const linkedDocumentIds = Object.values(doc.links ?? {}).map((url) => toDocumentId(url.toString()));
  const branchDocumentIds = DatabaseDirectory.getAllBranchDocUrls(doc).map((url) => toDocumentId(url));

  return { rootDocumentId: root.documentId, linkedDocumentIds, branchDocumentIds };
};

/** Distinct set of every document id owned by the space directory. */
export const allSpaceDocumentIds = (docs: SpaceDocumentSet): Set<DocumentId> =>
  new Set<DocumentId>([docs.rootDocumentId, ...docs.linkedDocumentIds, ...docs.branchDocumentIds]);

export type ObjectCounts = { alive: number; deleted: number };

const addObjectCounts = (counts: ObjectCounts, doc: DatabaseDirectory): void => {
  for (const object of Object.values(doc.objects ?? {}) as EntityStructure[]) {
    if (EntityStructure.isDeleted(object)) {
      counts.deleted += 1;
    } else {
      counts.alive += 1;
    }
  }
};

/**
 * Count live/soft-deleted objects across the root and every object-bearing linked document.
 * Branch documents are skipped to avoid double-counting an object across its branches.
 */
export const countSpaceObjects = async (
  ctx: Context,
  automergeHost: AutomergeHost,
  root: DatabaseRoot,
  docs: SpaceDocumentSet,
): Promise<ObjectCounts> => {
  const counts: ObjectCounts = { alive: 0, deleted: 0 };

  const rootDoc = root.doc();
  if (rootDoc) {
    addObjectCounts(counts, rootDoc);
  }

  for (const documentId of docs.linkedDocumentIds) {
    const handle = await automergeHost.loadDoc<DatabaseDirectory>(ctx, documentId);
    const doc = handle?.doc();
    if (doc) {
      addObjectCounts(counts, doc);
    }
  }

  return counts;
};
