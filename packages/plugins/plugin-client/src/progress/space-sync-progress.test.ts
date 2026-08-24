//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { type Database } from '@dxos/echo';

import { toSpaceUpdate } from './space-sync-progress';

describe('toSpaceUpdate', () => {
  test('caught up on both backlogs yields no monitor', () => {
    expect(toSpaceUpdate('Space', makeState({ totalDocumentCount: 10, totalBlocks: '100' }))).toBeUndefined();
  });

  test('combines documents and feed blocks into one meter', () => {
    const update = toSpaceUpdate(
      'Notes',
      makeState({
        totalDocumentCount: 10,
        unsyncedDocumentCount: 4,
        totalBlocks: '100',
        blocksToPull: '6',
        blocksToPush: '2',
      }),
    );
    expect(update).toEqual({
      label: 'Syncing Notes',
      current: 98,
      total: 110,
      note: '4 CRDTs · ↓6 ↑2',
    });
  });

  test('unsynced documents alone keep the meter up', () => {
    expect(toSpaceUpdate(undefined, makeState({ unsyncedDocumentCount: 3 }))).toEqual({
      label: 'Syncing space',
      current: 0,
      total: 3,
      note: '3 CRDTs',
    });
  });

  test('feed blocks alone keep the meter up', () => {
    expect(toSpaceUpdate('Notes', makeState({ totalBlocks: '10', blocksToPush: '2' }))).toEqual({
      label: 'Syncing Notes',
      current: 8,
      total: 10,
      note: '↓0 ↑2',
    });
  });
});

/** A fully caught-up sync state, overridden per case. */
const makeState = (state: Partial<Database.SyncState>): Database.SyncState => ({
  localDocumentCount: 0,
  remoteDocumentCount: 0,
  totalDocumentCount: 0,
  unsyncedDocumentCount: 0,
  blocksToPull: '0',
  blocksToPush: '0',
  totalBlocks: '0',
  ...state,
});
