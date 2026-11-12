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

/** The base58check document id of a binary id, a document id, or an Automerge URL; throws on anything else. */
export const interpretAsDocumentId = (id: AnyDocumentId): DocumentId => {
  if (id instanceof Uint8Array) {
    return bs58check.encode(id) as DocumentId;
  }
  const documentId = id.startsWith(URL_PREFIX) ? parseDocumentId(id) : isValidDocumentId(id) ? id : undefined;
  if (documentId === undefined) {
    throw new Error(`Invalid AutomergeUrl: '${id}'`);
  }
  return documentId as DocumentId;
};
