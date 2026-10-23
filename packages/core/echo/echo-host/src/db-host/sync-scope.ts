//
// Copyright 2026 DXOS.org
//

import { type DocumentId, interpretAsDocumentId, isValidAutomergeUrl } from '@automerge/automerge-repo';

import { type DatabaseDirectory } from '@dxos/echo-protocol';

/**
 * A space directory's linked documents split by a sync scope.
 */
export type ScopedDocuments = {
  /** Documents holding an object in the scope, or a branch of one. */
  inScope: DocumentId[];
  /** Every other linked or branch document, with the ids of the objects it holds. */
  outOfScope: Record<DocumentId, string[]>;
};

/**
 * Splits the documents a directory links by whether they hold an object in `scope`. A document shared by an object in
 * the scope and one outside it is in scope, since the object in scope cannot load without it.
 */
export const partitionBySyncScope = (directory: DatabaseDirectory, scope: ReadonlySet<string>): ScopedDocuments => {
  const inScope = new Set<DocumentId>();
  const objectsByDocument = new Map<DocumentId, Set<string>>();
  const add = (url: string, objectId: string) => {
    if (!isValidAutomergeUrl(url)) {
      return;
    }
    const documentId = interpretAsDocumentId(url);
    const objects = objectsByDocument.get(documentId) ?? new Set();
    objectsByDocument.set(documentId, objects.add(objectId));
    if (scope.has(objectId)) {
      inScope.add(documentId);
    }
  };

  for (const [objectId, link] of Object.entries(directory.links ?? {})) {
    add(link.toString(), objectId);
  }
  for (const [rootObjectId, byName] of Object.entries(directory.branches ?? {})) {
    for (const record of Object.values(byName)) {
      for (const url of Object.values(record.members ?? {})) {
        add(url.toString(), rootObjectId);
      }
    }
  }

  return {
    inScope: [...inScope],
    outOfScope: Object.fromEntries(
      [...objectsByDocument]
        .filter(([documentId]) => !inScope.has(documentId))
        .map(([documentId, objects]) => [documentId, [...objects]]),
    ),
  };
};
