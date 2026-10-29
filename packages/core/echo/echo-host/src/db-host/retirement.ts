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

/** Ops below which a document is never retired for its history, however it grew. */
export const HISTORY_BLOAT_MIN_OPS = 100_000;

/** How many times its current state's size a document's ops must reach before its history counts as bloated. */
const HISTORY_BLOAT_RATIO = 4;

/**
 * Object types whose documents are retired when their history bloats. Sync cursors hold only machine-written
 * state, so rebuilding them from their current state loses nothing a user wrote.
 */
const HISTORY_RETIREMENT_TYPES: readonly string[] = ['dxn:org.dxos.type.cursor:'];

/** A `retired` entry of a space directory, read back; see {@link DatabaseDirectory.retired}. */
export type Retirement = { documentId: string; replacedBy: string; reason: RetirementReason };

/** One object of a retired document, as the index last saw it. */
export type IndexedObject = {
  objectId: string;
  json: Obj.JSON;
  createdAt: number | null;
};

/**
 * Id of a document derived from `seed` rather than random, so peers that create the document for the same reason
 * concurrently write into one document instead of linking several.
 */
export const deriveDocumentId = async (seed: string): Promise<DocumentId> => {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(seed));
  const id = bs58check.encode(new Uint8Array(digest).subarray(0, 16));
  invariant(isValidDocumentId(id), 'Derived document id is invalid.');
  return id;
};

/**
 * A document as one deterministic change: its actor is derived from `seed` and the content exactly as inserted,
 * and its timestamp is fixed. Peers that build the same state produce byte-identical changes that merge into one;
 * any difference yields a distinct actor, which Automerge merges as a conflict.
 */
export const buildDeterministicDocument = async (
  seed: string,
  directory: DatabaseDirectory,
): Promise<A.Doc<DatabaseDirectory>> => {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(`${seed}:${JSON.stringify(directory)}`),
  );
  const actor = Array.from(new Uint8Array(digest).subarray(0, 16), (byte) => byte.toString(16).padStart(2, '0')).join(
    '',
  );
  return A.change(A.init<DatabaseDirectory>({ actor }), { time: 0 }, (draft) => Object.assign(draft, directory));
};

/** Id of the document that replaces `documentId` when it is retired. */
export const replacementDocumentId = (documentId: DocumentId): Promise<DocumentId> =>
  deriveDocumentId(`dxos:retired:${documentId}`);

/** The replacement document of `documentId`; see {@link buildDeterministicDocument}. */
export const buildReplacementDocument = (
  documentId: DocumentId,
  directory: DatabaseDirectory,
): Promise<A.Doc<DatabaseDirectory>> => buildDeterministicDocument(`dxos:retired:${documentId}`, directory);

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

/** Whether a document's history has outgrown its current state, which a rebuild without history would fix. */
export const isHistoryBloated = ({ ops, stateBytes }: { ops: number; stateBytes: number }): boolean =>
  ops >= HISTORY_BLOAT_MIN_OPS && ops >= HISTORY_BLOAT_RATIO * stateBytes;

/** Whether every object's type is one {@link HISTORY_RETIREMENT_TYPES} allows to be rebuilt. */
export const isRetirableForHistory = (typeDXNs: readonly (string | null | undefined)[]): boolean =>
  typeDXNs.length > 0 &&
  typeDXNs.every((typeDXN) => HISTORY_RETIREMENT_TYPES.some((prefix) => typeDXN?.startsWith(prefix) ?? false));
