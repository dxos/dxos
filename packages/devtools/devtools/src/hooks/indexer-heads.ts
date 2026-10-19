//
// Copyright 2026 DXOS.org
//

import { type IndexerHeadsResponse } from '@dxos/protocols';

/**
 * Counts the local documents holding a head the EDGE indexer has not indexed, which covers a document
 * missing from the index, one behind, and one diverged. Extra heads on the indexer's side do not count:
 * EDGE reports Subduction's `getAllHeads`, which lists fragment heads beside the tips, so an ancestor
 * of the tip can appear there even when every change is indexed.
 */
export const countUnindexed = (local: Record<string, readonly string[]>, remote: IndexerHeadsResponse): number => {
  const indexedHeads = new Map(remote.documents.map(({ documentId, heads }) => [documentId, heads]));
  return Object.entries(local).filter(([documentId, heads]) => {
    const indexed = indexedHeads.get(documentId) ?? [];
    return !heads.every((head) => indexed.includes(head));
  }).length;
};
