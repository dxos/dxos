//
// Copyright 2026 DXOS.org
//

import { type DocumentId, interpretAsDocumentId, isValidAutomergeUrl } from '@automerge/automerge-repo';

import {
  type DatabaseDirectory,
  EncodedReference,
  type EntityStructure,
  isEncodedReference,
} from '@dxos/echo-protocol';
import { EID, type SpaceId } from '@dxos/keys';

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

/**
 * The objects of `spaceId` an object points at directly — its parent and every reference in its data — which it
 * renders with; a reference into another space is not followed.
 */
export const findReferencedObjectIds = (structure: EntityStructure, spaceId: SpaceId): string[] => {
  const referenced = new Set<string>();
  const add = (reference: EncodedReference) => {
    const uri = EncodedReference.toURI(reference);
    if (!EID.isEID(uri)) {
      return;
    }
    const referencedSpaceId = EID.getSpaceId(uri);
    const objectId = EID.getEntityId(uri);
    if (objectId && (referencedSpaceId === undefined || referencedSpaceId === spaceId)) {
      referenced.add(objectId);
    }
  };
  const visit = (value: unknown) => {
    if (isEncodedReference(value)) {
      add(value);
    } else if (Array.isArray(value)) {
      value.forEach(visit);
    } else if (value !== null && typeof value === 'object') {
      Object.values(value).forEach(visit);
    }
  };

  if (structure.system?.parent) {
    add(structure.system.parent);
  }
  visit(structure.data);
  return [...referenced];
};
