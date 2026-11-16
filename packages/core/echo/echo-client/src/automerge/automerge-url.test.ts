//
// Copyright 2026 DXOS.org
//

import * as Repo from '@automerge/automerge-repo';
import { describe, test } from 'vitest';

import { interpretAsDocumentId, isValidAutomergeUrl, stringifyAutomergeUrl } from './automerge-url.ts';

const URL = Repo.generateAutomergeUrl();
const { documentId, binaryDocumentId } = Repo.parseAutomergeUrl(URL);
const HEADS = Repo.encodeHeads(['aa'.repeat(32), 'bb'.repeat(32)]);

/** Inputs whose verdict must match `@automerge/automerge-repo`, which these helpers stand in for. */
const CANDIDATES: unknown[] = [
  URL,
  `${URL}#${HEADS.join('|')}`,
  `${URL}#`,
  `${URL}#not-a-head`,
  `${URL}#${HEADS[0]}#${HEADS[1]}`,
  documentId,
  `automerge:${documentId.slice(1)}`,
  'automerge:',
  'automerge:/path',
  'not-a-url',
  '',
  undefined,
  42,
];

describe('automerge-url', () => {
  test('isValidAutomergeUrl agrees with automerge-repo', ({ expect }) => {
    for (const candidate of CANDIDATES) {
      expect(isValidAutomergeUrl(candidate), String(candidate)).toBe(Repo.isValidAutomergeUrl(candidate));
    }
  });

  test('stringifyAutomergeUrl agrees with automerge-repo', ({ expect }) => {
    expect(stringifyAutomergeUrl(documentId)).toBe(Repo.stringifyAutomergeUrl(documentId));
  });

  test('interpretAsDocumentId agrees with automerge-repo', ({ expect }) => {
    const ids: Repo.AnyDocumentId[] = [
      URL,
      Repo.stringifyAutomergeUrl({ documentId, heads: HEADS }),
      documentId,
      binaryDocumentId,
    ];
    for (const id of ids) {
      expect(interpretAsDocumentId(id)).toBe(Repo.interpretAsDocumentId(id));
    }
  });

  test('interpretAsDocumentId converts a legacy UUID as automerge-repo does', ({ expect }) => {
    const isLegacyDocumentId = (value: string): value is Repo.LegacyDocumentId => value.includes('-');
    const uuids = [crypto.randomUUID(), '00000000-0000-0000-0000-000000000000'].filter(isLegacyDocumentId);
    expect(uuids).toHaveLength(2);
    for (const uuid of uuids) {
      expect(interpretAsDocumentId(uuid)).toBe(Repo.interpretAsDocumentId(uuid));
    }
  });
});
