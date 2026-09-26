//
// Copyright 2026 DXOS.org
//

import * as Repo from '@automerge/automerge-repo';
import { describe, expect, test } from 'vitest';

import { interpretAsDocumentId, isValidAutomergeUrl, stringifyAutomergeUrl } from './automerge-url.ts';
import { toDocumentId } from './document-id.ts';

/** What `read` makes of `value`, or 'throws'. */
const attempt = (read: (id: Repo.AnyDocumentId) => string, value: string): string => {
  try {
    // Unbranded on purpose: both check any string at runtime, as data from a document can be.
    return read(value as Repo.AnyDocumentId);
  } catch {
    return 'throws';
  }
};

describe('document ids and urls', () => {
  const urls = Array.from({ length: 50 }, () => Repo.generateAutomergeUrl());
  // Change hashes are 32 bytes, as hex.
  const heads = Repo.encodeHeads(['ab', 'cd', 'ef'].map((byte) => byte.repeat(32)));
  const withHeads = urls
    .slice(3, 10)
    .map((url) => Repo.stringifyAutomergeUrl({ documentId: Repo.interpretAsDocumentId(url), heads }));
  const invalid = [
    '',
    'automerge:',
    'automerge:abc',
    'automerge:0OIl',
    `${urls[0]}#not-base58`,
    `${urls[0]}#${heads[0]}#${heads[1]}`,
    urls[0].replace('automerge:', 'automerge'),
    urls[0].slice(0, -2),
    'document',
  ];

  test('read every url and id as automerge-repo reads them', () => {
    for (const value of [...urls, ...withHeads, ...invalid, `${urls[0]}/path/to`, `${urls[0]}#`]) {
      expect(isValidAutomergeUrl(value), value).toBe(Repo.isValidAutomergeUrl(value));
      expect(attempt(interpretAsDocumentId, value), value).toBe(attempt(Repo.interpretAsDocumentId, value));
    }
  });

  test('write urls and read binary ids as automerge-repo does', () => {
    for (const url of urls) {
      const documentId = Repo.interpretAsDocumentId(url);
      expect(stringifyAutomergeUrl(documentId)).toBe(Repo.stringifyAutomergeUrl(documentId));
      const binary = Repo.documentIdToBinary(documentId);
      expect(binary).toBeDefined();
      if (binary) {
        expect(interpretAsDocumentId(binary)).toBe(documentId);
      }
      expect(toDocumentId(url)).toBe(documentId);
      expect(toDocumentId(documentId)).toBe(documentId);
    }
  });
});
