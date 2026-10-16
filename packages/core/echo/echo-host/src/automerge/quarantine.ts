//
// Copyright 2026 DXOS.org
//

import { type DocumentId } from '@automerge/automerge-repo';

/**
 * Raised to a caller waiting on, or leasing, a document the host has quarantined.
 */
export class DocumentQuarantinedError extends Error {
  constructor(readonly documentId: DocumentId) {
    super(`Document is quarantined: ${documentId}`);
    this.name = 'DocumentQuarantinedError';
  }
}

/**
 * Whether a load failed because the document cannot fit in Automerge's WASM heap — `error inflating document chunk
 * ops: out of memory` from `loadIncremental`, or the heap refusing to grow. Every load of such a document fails the
 * same way, while any other error (a storage read, malformed bytes) may not repeat.
 */
export const isOutOfMemoryError = (error: unknown): boolean =>
  error instanceof Error &&
  /out of memory|maximum memory size exceeded|could not allocate memory|allocation failed/i.test(error.message);
