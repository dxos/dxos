//
// Copyright 2026 DXOS.org
//

import { next as A } from '@automerge/automerge';
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

/** Plain objects with their keys sorted, recursively, so equal content always serializes and inserts alike. */
const canonicalize = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }
  if (value !== null && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
        .map(([key, entry]) => [key, canonicalize(entry)]),
    );
  }
  return value;
};

/**
 * The replacement document as one deterministic change: its actor is derived from the document it replaces and
 * the content, and its timestamp is fixed. Peers that rebuild the same state produce byte-identical changes that
 * merge into one; peers whose index state differs produce distinct actors, which Automerge merges as a conflict.
 */
export const buildReplacementDocument = async (
  documentId: DocumentId,
  directory: DatabaseDirectory,
): Promise<A.Doc<DatabaseDirectory>> => {
  const content = canonicalize(directory) as DatabaseDirectory;
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(`dxos:retired:${documentId}:${JSON.stringify(content)}`),
  );
  const actor = Array.from(new Uint8Array(digest).subarray(0, 16), (byte) => byte.toString(16).padStart(2, '0')).join(
    '',
  );
  return A.change(A.init<DatabaseDirectory>({ actor }), { time: 0 }, (draft) => Object.assign(draft, content));
};

/** Ops below which a document is never retired for its history, however it grew. */
export const HISTORY_BLOAT_MIN_OPS = 100_000;

/** How many times its current state's size a document's ops must reach before its history counts as bloated. */
const HISTORY_BLOAT_RATIO = 4;

/**
 * Object types whose documents are retired when their history bloats. Sync cursors hold only machine-written
 * state that the index captures whole, so rebuilding them from it loses nothing a user wrote.
 */
const HISTORY_RETIREMENT_TYPES: readonly string[] = ['dxn:org.dxos.type.cursor:'];

/** Whether a document's history has outgrown its current state, which a rebuild without history would fix. */
export const isHistoryBloated = ({ ops, stateBytes }: { ops: number; stateBytes: number }): boolean =>
  ops >= HISTORY_BLOAT_MIN_OPS && ops >= HISTORY_BLOAT_RATIO * stateBytes;

/** Whether every object's type is one {@link HISTORY_RETIREMENT_TYPES} allows to be rebuilt from the index. */
export const isRetirableForHistory = (typeDXNs: readonly (string | null | undefined)[]): boolean =>
  typeDXNs.length > 0 &&
  typeDXNs.every((typeDXN) => HISTORY_RETIREMENT_TYPES.some((prefix) => typeDXN?.startsWith(prefix) ?? false));
