//
// Copyright 2026 DXOS.org
//

// Not imported from `@automerge/automerge-repo`: its entry evaluates the subduction WASM bindings, which would then
// load into every EDGE plugin bundle that reaches this client.

import { type AnyDocumentId, type AutomergeUrl, type DocumentId } from '@automerge/automerge-repo';
import bs58check from 'bs58check';

const URL_PREFIX = 'automerge:';

/** `automerge:<documentId>`, optionally followed by `/<path>`. */
const URL_PATTERN = /^automerge:([^/]+)(?:\/.*)?$/;

const isValidDocumentId = (value: string): boolean => bs58check.decodeUnsafe(value) !== undefined;

/** `uuid`'s `validate` pattern, which automerge-repo accepts as a legacy document id. */
const UUID_PATTERN =
  /^(?:[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$/i;

/** The 16 bytes of a UUID, in order, as `uuid`'s `parse` returns them. */
const parseUuid = (uuid: string): Uint8Array =>
  Uint8Array.from(uuid.replaceAll('-', '').match(/../g) ?? [], (byte) => parseInt(byte, 16));

const isValidHead = (head: string): boolean => {
  try {
    bs58check.decode(head);
    return true;
  } catch {
    return false;
  }
};

/** The document id of `automerge:<documentId>[/<path>][#<heads>]`, or `undefined` when `url` is not one. */
const parseDocumentId = (url: string): DocumentId | undefined => {
  const [base, heads, ...rest] = url.split('#');
  const documentId = rest.length === 0 ? base.match(URL_PATTERN)?.[1] : undefined;
  if (documentId === undefined || !isValidDocumentId(documentId)) {
    return undefined;
  }
  if (heads !== undefined && heads !== '' && !heads.split('|').every(isValidHead)) {
    return undefined;
  }
  return documentId as DocumentId;
};

/** Whether `value` is an Automerge URL whose document id and heads decode. */
export const isValidAutomergeUrl = (value: unknown): value is AutomergeUrl =>
  typeof value === 'string' && value.startsWith(URL_PREFIX) && parseDocumentId(value) !== undefined;

/** The URL of a whole document. */
export const stringifyAutomergeUrl = (documentId: DocumentId): AutomergeUrl =>
  `${URL_PREFIX}${documentId}` as AutomergeUrl;

/**
 * The base58check document id of a binary id, a document id, an Automerge URL, or a legacy UUID; throws on anything
 * else.
 */
export const interpretAsDocumentId = (id: AnyDocumentId): DocumentId => {
  if (id instanceof Uint8Array) {
    return bs58check.encode(id) as DocumentId;
  }
  const documentId = id.startsWith(URL_PREFIX) ? parseDocumentId(id) : isValidDocumentId(id) ? id : undefined;
  if (documentId !== undefined) {
    return documentId as DocumentId;
  }
  if (UUID_PATTERN.test(id)) {
    return bs58check.encode(parseUuid(id)) as DocumentId;
  }
  throw new Error(`Invalid AutomergeUrl: '${id}'`);
};
