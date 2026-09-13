//
// Copyright 2026 DXOS.org
//

import { type AnyDocumentId, type DocumentId, interpretAsDocumentId } from '@automerge/automerge-repo';

/** Bounds the cache; cleared wholesale rather than evicted, since a miss only costs one decode. */
const CACHE_LIMIT = 100_000;

const cache = new Map<string, DocumentId>();

/**
 * `interpretAsDocumentId` base58check-decodes a url (two sha256 passes) on every call, and the
 * client meets the same urls on every space-root update, so the decode is paid once per url.
 */
export const toDocumentId = (id: AnyDocumentId): DocumentId => {
  if (typeof id !== 'string') {
    return interpretAsDocumentId(id);
  }
  const cached = cache.get(id);
  if (cached) {
    return cached;
  }
  const documentId = interpretAsDocumentId(id);
  if (cache.size >= CACHE_LIMIT) {
    cache.clear();
  }
  cache.set(id, documentId);
  return documentId;
};
