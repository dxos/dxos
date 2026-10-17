//
// Copyright 2026 DXOS.org
//

import { next as A } from '@automerge/automerge';
import { type DocumentId, isValidDocumentId } from '@automerge/automerge-repo';
import bs58check from 'bs58check';

import { type Obj } from '@dxos/echo';
import {
  type DatabaseDirectory,
  type EntityStructure,
  type RetirementReason,
  SpaceDocVersion,
} from '@dxos/echo-protocol';
import { objectStructureFromJson } from '@dxos/echo/internal';
import { invariant } from '@dxos/invariant';
import { type SpaceId } from '@dxos/keys';

/** A `retired` entry of a space directory, read back; see {@link DatabaseDirectory.retired}. */
export type Retirement = { documentId: string; replacedBy: string; reason: RetirementReason };

/** One object of a retired document, as the index last saw it. */
export type IndexedObject = {
  objectId: string;
  json: Obj.JSON;
  createdAt: number | null;
};

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

/**
 * The replacement document as one deterministic change: its actor is derived from the document it replaces and the
 * content exactly as inserted, and its timestamp is fixed. Peers that rebuild the same state produce byte-identical
 * changes that merge into one; any difference yields a distinct actor, which Automerge merges as a conflict.
 */
export const buildReplacementDocument = async (
  documentId: DocumentId,
  directory: DatabaseDirectory,
): Promise<A.Doc<DatabaseDirectory>> => {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(`dxos:retired:${documentId}:${JSON.stringify(directory)}`),
  );
  const actor = Array.from(new Uint8Array(digest).subarray(0, 16), (byte) => byte.toString(16).padStart(2, '0')).join(
    '',
  );
  return A.change(A.init<DatabaseDirectory>({ actor }), { time: 0 }, (draft) => Object.assign(draft, directory));
};

/** The directory that replaces an unloadable document: its objects rebuilt from the index, with no history. */
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
