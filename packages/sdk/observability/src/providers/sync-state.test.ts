//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { type Database } from '@dxos/echo';

import { foldSyncStates } from './sync-state';

const state = (overrides: Partial<Database.SyncState>): Database.SyncState => ({
  localDocumentCount: 0,
  remoteDocumentCount: 0,
  totalDocumentCount: 0,
  unsyncedDocumentCount: 0,
  blocksToPull: '0',
  blocksToPush: '0',
  totalBlocks: '0',
  ...overrides,
});

describe('foldSyncStates', () => {
  test('no spaces folds to zero', () => {
    expect(foldSyncStates([])).toEqual({
      localDocumentCount: 0,
      remoteDocumentCount: 0,
      unsyncedDocumentCount: 0,
      blocksToPull: 0,
      blocksToPush: 0,
      pendingWorkCount: 0,
    });
  });

  test('sums document counts across spaces', () => {
    const summary = foldSyncStates([
      state({ localDocumentCount: 10, remoteDocumentCount: 12, unsyncedDocumentCount: 2 }),
      state({ localDocumentCount: 5, remoteDocumentCount: 5, unsyncedDocumentCount: 0 }),
    ]);

    expect(summary.localDocumentCount).toEqual(15);
    expect(summary.remoteDocumentCount).toEqual(17);
    expect(summary.unsyncedDocumentCount).toEqual(2);
  });

  test('feed blocks arrive as strings and are summed numerically', () => {
    // Concatenation here would silently produce '00' rather than 0.
    const summary = foldSyncStates([
      state({ blocksToPull: '3', blocksToPush: '4' }),
      state({ blocksToPull: '10', blocksToPush: '0' }),
    ]);

    expect(summary.blocksToPull).toEqual(13);
    expect(summary.blocksToPush).toEqual(4);
  });

  test('pending work counts documents and feed blocks together', () => {
    // The case the sync-stuck detection exists for: documents converged, feed backlog did not, so
    // a document-only definition of caught-up would call this client synced.
    const summary = foldSyncStates([state({ unsyncedDocumentCount: 0, blocksToPull: '7', blocksToPush: '0' })]);

    expect(summary.unsyncedDocumentCount).toEqual(0);
    expect(summary.pendingWorkCount).toEqual(7);
  });

  test('pending work is zero only when both backlogs are drained', () => {
    expect(foldSyncStates([state({})]).pendingWorkCount).toEqual(0);
    expect(foldSyncStates([state({ unsyncedDocumentCount: 1 })]).pendingWorkCount).toEqual(1);
    expect(foldSyncStates([state({ blocksToPush: '1' })]).pendingWorkCount).toEqual(1);
  });
});
