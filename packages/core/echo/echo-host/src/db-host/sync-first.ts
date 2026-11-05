//
// Copyright 2026 DXOS.org
//

import { type DocumentId, interpretAsDocumentId, isValidAutomergeUrl } from '@automerge/automerge-repo';

import { type DatabaseDirectory } from '@dxos/echo-protocol';

/**
 * The documents of a space to replicate before the rest of it: those holding `objectIds` (their branches included),
 * and every document the directory does not link, such as the root and its credentials, without which the space does
 * not open.
 * @param documentIds Every document of the space, as its collection names them.
 */
export const selectSyncFirstDocuments = (
  documentIds: readonly DocumentId[],
  directory: DatabaseDirectory,
  objectIds: ReadonlySet<string>,
): DocumentId[] => {
  const linked = new Set<DocumentId>();
  const first = new Set<DocumentId>();
  const add = (objectId: string, url: string) => {
    if (!isValidAutomergeUrl(url)) {
      return;
    }
    const documentId = interpretAsDocumentId(url);
    linked.add(documentId);
    if (objectIds.has(objectId)) {
      first.add(documentId);
    }
  };

  for (const [objectId, url] of Object.entries(directory.links ?? {})) {
    add(objectId, url.toString());
  }
  for (const [rootObjectId, byName] of Object.entries(directory.branches ?? {})) {
    for (const record of Object.values(byName)) {
      for (const url of Object.values(record.members ?? {})) {
        add(rootObjectId, url.toString());
      }
    }
  }

  return documentIds.filter((documentId) => !linked.has(documentId) || first.has(documentId));
};
