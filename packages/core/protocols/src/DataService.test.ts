//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import { describe, expect, test } from 'vitest';

import * as DataService from './DataService.ts';

// A field the schema does not declare is dropped without an error, so a host and client that disagree on
// these shapes fail far from here: the host never registers the document and rejects its first write.
describe('DataService wire schema', () => {
  test('a subscription add keeps the heads and the passive flag of every document', () => {
    const request: DataService.UpdateSubscriptionRequest = {
      subscriptionId: 'subscription',
      add: [
        { id: 'held', heads: ['head-1', 'head-2'], passive: true },
        { id: 'loaded', heads: ['head-3'] },
        { id: 'new' },
      ],
      removeIds: ['released'],
    };

    const schema = DataService.UpdateSubscriptionRequest;
    expect(Schema.decodeSync(schema)(Schema.encodeSync(schema)(request))).toEqual(request);
  });

  test('a document update keeps the passive JSON the client shows its object from', () => {
    const batch: DataService.BatchedDocumentUpdates = {
      updates: [
        {
          documentId: 'held',
          mutation: new Uint8Array([1, 2, 3]),
          passive: { heads: ['head-1'], json: '{"title":"held"}', updatedAt: 1_700_000_000_000 },
        },
        { documentId: 'oversized', mutation: new Uint8Array([4]), passive: { heads: ['head-2'] } },
      ],
    };

    const schema = DataService.BatchedDocumentUpdates;
    expect(Schema.decodeSync(schema)(Schema.encodeSync(schema)(batch))).toEqual(batch);
  });
});

describe('DataService.movesPhase', () => {
  test('a migration or rebuild moving is progress, and a lane moving alone is not', () => {
    const rebuild: DataService.IndexStatus = { phase: 'indexing', done: 10, total: 100 };
    const catchUp = { done: 0, total: 10 };
    expect(DataService.movesPhase(null, { phase: 'migrating', done: 0, total: 1 })).toBe(true);
    expect(DataService.movesPhase(null, { phase: 'idle', done: 0, total: 0, catchUp })).toBe(false);
    expect(DataService.movesPhase(rebuild, { ...rebuild, done: 20 })).toBe(true);
    expect(DataService.movesPhase(rebuild, { ...rebuild, catchUp })).toBe(false);
    expect(DataService.movesPhase(rebuild, { phase: 'idle', done: 0, total: 0, catchUp })).toBe(true);
  });
});
