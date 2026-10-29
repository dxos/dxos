//
// Copyright 2026 DXOS.org
//

import { next as A } from '@automerge/automerge';
import { type DocumentId } from '@automerge/automerge-repo';

import { type DatabaseDirectory, type EntityStructure, SpaceDocVersion } from '@dxos/echo-protocol';
import { type SpaceId } from '@dxos/keys';

import { buildDeterministicDocument, deriveDocumentId } from './retirement.ts';

/** One seed per directory and object, so peers that migrate the same object concurrently write one document. */
const inlineObjectSeed = (directoryId: DocumentId, objectId: string): string =>
  `dxos:inline:${directoryId}:${objectId}`;

/** Id of the document an object inlined in the space directory `directoryId` moves to. */
export const inlineObjectDocumentId = (directoryId: DocumentId, objectId: string): Promise<DocumentId> =>
  deriveDocumentId(inlineObjectSeed(directoryId, objectId));

/**
 * The document an inlined object moves to, holding only that object, as one deterministic change; see
 * {@link buildDeterministicDocument}.
 */
export const buildInlineObjectDocument = ({
  directoryId,
  spaceId,
  spaceKey,
  objectId,
  structure,
}: {
  directoryId: DocumentId;
  spaceId: SpaceId;
  /** Written alongside `spaceId` for clients that still read it, as every new document is. */
  spaceKey: string | null;
  objectId: string;
  structure: EntityStructure;
}): Promise<A.Doc<DatabaseDirectory>> =>
  buildDeterministicDocument(inlineObjectSeed(directoryId, objectId), {
    version: SpaceDocVersion.CURRENT,
    access: spaceKey ? { spaceId, spaceKey } : { spaceId },
    objects: { [objectId]: structure },
  });

/**
 * Whether a document holds only creation changes - the deterministic ones migrating peers write, which depend on
 * nothing. Its object is then still the inline copy as some peer saw it, and no one has edited it through a link.
 */
export const isUntouchedSinceCreation = (doc: A.Doc<DatabaseDirectory>): boolean =>
  A.getAllChanges(doc).every((change) => A.decodeChange(change).deps.length === 0);
