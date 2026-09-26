//
// Copyright 2026 DXOS.org
//

import { type AnyDocumentId, type AutomergeUrl, type DocumentId } from '@automerge/automerge-repo';
import bs58check from 'bs58check';

// automerge-repo's root loads Automerge, so the tab keeps its own copy of the url helpers it needs,
// over the same `bs58check`, so the ids and urls come out identical.

const URL_PREFIX = 'automerge:';

const URL_PATTERN = /^automerge:([^/]+)(?:\/(.*))?$/;

/** Whether `id` is base58check, as every document id automerge-repo mints is. */
const isDocumentId = (id: string): boolean => bs58check.decodeUnsafe(id) !== undefined;

/**
 * The document id of an Automerge url (`automerge:<id>`, with an optional path and heads), or undefined
 * when `url` is not one. A path's segments are not checked, since ECHO writes no sub-document url.
 */
const documentIdOfUrl = (url: string): DocumentId | undefined => {
  if (!url.startsWith(URL_PREFIX)) {
    return undefined;
  }
  const [base, heads, ...rest] = url.split('#');
  const documentId = base.match(URL_PATTERN)?.[1];
  if (rest.length > 0 || documentId === undefined || !isDocumentId(documentId)) {
    return undefined;
  }
  if (heads && !heads.split('|').every(isDocumentId)) {
    return undefined;
  }
  // A base58check id is what automerge-repo brands as a `DocumentId`.
  return documentId as DocumentId;
};

/** Whether `value` is an Automerge url, as automerge-repo's `isValidAutomergeUrl` decides. */
export const isValidAutomergeUrl = (value: unknown): value is AutomergeUrl =>
  typeof value === 'string' && documentIdOfUrl(value) !== undefined;

/** The url of a document, as automerge-repo's `stringifyAutomergeUrl` writes it. */
export const stringifyAutomergeUrl = (documentId: DocumentId): AutomergeUrl =>
  // The prefixed id is what automerge-repo brands as an `AutomergeUrl`.
  `${URL_PREFIX}${documentId}` as AutomergeUrl;

/**
 * A document id in any form (binary, url or base58check) as a `DocumentId`, as automerge-repo's
 * `interpretAsDocumentId` reads it; throws on anything else. automerge-repo also reads legacy UUIDs,
 * which no ECHO document id is.
 */
export const interpretAsDocumentId = (id: AnyDocumentId): DocumentId => {
  if (id instanceof Uint8Array) {
    // automerge-repo brands the base58check encoding of a binary id as a `DocumentId`.
    return bs58check.encode(id) as DocumentId;
  }
  const fromUrl = documentIdOfUrl(id);
  if (fromUrl) {
    return fromUrl;
  }
  if (isDocumentId(id)) {
    // A base58check id is what automerge-repo brands as a `DocumentId`.
    return id as DocumentId;
  }
  throw new Error(`Invalid AutomergeUrl: '${id}'`);
};
