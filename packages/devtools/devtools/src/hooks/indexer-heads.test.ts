//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { SpaceId } from '@dxos/keys';
import { type IndexerHeadsResponse } from '@dxos/protocols';

import { countUnindexed } from './indexer-heads.ts';

const indexer = (documents: Record<string, string[]>): IndexerHeadsResponse => ({
  spaceId: SpaceId.random(),
  indexingInProgress: false,
  documents: Object.entries(documents).map(([documentId, heads]) => ({ documentId, heads })),
});

describe('countUnindexed', () => {
  test('a document indexed at the same heads is up to date', ({ expect }) => {
    expect(countUnindexed({ doc: ['a', 'b'] }, indexer({ doc: ['b', 'a'] }))).toBe(0);
  });

  test('a fragment head EDGE lists beside the tip is not a lag', ({ expect }) => {
    // A space directory on EDGE dev after 1000 writes: `1659afed` is already in the client's history.
    const tip = '8de7799e7c628120bce1940af72e50f9dea53b6bcea22cd2475fa307725446d0';
    const fragmentHead = '1659afed3093d47485cb35f6ca62981d5b159105791aec05c8401856929c9b7b';
    expect(countUnindexed({ directory: [tip] }, indexer({ directory: [fragmentHead, tip] }))).toBe(0);
  });

  test('a local head the indexer lacks counts, as does a document it never indexed', ({ expect }) => {
    expect(countUnindexed({ behind: ['b'], missing: ['c'] }, indexer({ behind: ['a'] }))).toBe(2);
  });

  test('a document with no local heads has nothing to index', ({ expect }) => {
    expect(countUnindexed({ empty: [] }, indexer({}))).toBe(0);
  });
});
