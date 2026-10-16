//
// Copyright 2026 DXOS.org
//

import { type DocumentId, isValidDocumentId } from '@automerge/automerge-repo';
import bs58check from 'bs58check';

import { type Obj } from '@dxos/echo';
import { type DatabaseDirectory, type EntityStructure, SpaceDocVersion } from '@dxos/echo-protocol';
import { objectStructureFromJson } from '@dxos/echo/internal';
import { invariant } from '@dxos/invariant';
import { type SpaceId } from '@dxos/keys';

/**
 * Id of the document that replaces `documentId` when it is retired. Derived rather than random, so peers that
 * retire the same document concurrently write into one replacement instead of linking several.
 */
export const replacementDocumentId = async (documentId: DocumentId): Promise<DocumentId> => {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`dxos:retired:${documentId}`));
  const id = bs58check.encode(new Uint8Array(digest).subarray(0, 16));
  invariant(isValidDocumentId(id), 'Derived replacement document id is invalid.');
  return id;
};

/** One object of a retired document, as the index last saw it. */
export type IndexedObject = {
  objectId: string;
  json: Obj.JSON;
  createdAt: number | null;
};

/**
 * The directory that replaces a retired document: its objects rebuilt from the index, with no history.
 */
export const makeReplacementDirectory = ({
  spaceId,
  spaceKey,
  objects,
}: {
  spaceId: SpaceId;
  /** Written alongside `spaceId` for clients that still read it, as every new document is. */
  spaceKey: string | null;
  objects: readonly IndexedObject[];
}): DatabaseDirectory => ({
  version: SpaceDocVersion.CURRENT,
  access: spaceKey ? { spaceId, spaceKey } : { spaceId },
  objects: Object.fromEntries(
    objects.map(({ objectId, json, createdAt }): [string, EntityStructure] => [
      objectId,
      objectStructureFromJson(json, { createdAt: createdAt ?? undefined }),
    ]),
  ),
});
