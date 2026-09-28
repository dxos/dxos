//
// Copyright 2026 DXOS.org
//

import { type AnyDocumentId, type DocumentId } from '@automerge/automerge-repo';

import { interpretAsDocumentId } from './automerge-url.ts';

const URL_PREFIX = 'automerge:';

/**
 * `interpretAsDocumentId` base58check-decodes a url (two sha256 passes) on every call, and the
 * client meets the same urls on every space-root update, so a plain `automerge:<id>` url is sliced.
 */
export const toDocumentId = (id: AnyDocumentId): DocumentId => {
  if (typeof id === 'string' && id.startsWith(URL_PREFIX)) {
    const documentId = id.slice(URL_PREFIX.length);
    if (!documentId.includes('/') && !documentId.includes('#')) {
      // The client meets only urls the worker minted, whose ids automerge-repo branded.
      return documentId as DocumentId;
    }
  }
  return interpretAsDocumentId(id);
};
