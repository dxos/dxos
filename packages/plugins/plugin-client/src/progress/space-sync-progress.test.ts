//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { type Database } from '@dxos/echo';

import { toSpaceUpdate } from './space-sync-progress.ts';

describe('toSpaceUpdate', () => {
  test('caught up on both backlogs yields no monitor', ({ expect }) => {
    expect(toSpaceUpdate('Space', makeState({ totalDocumentCount: 10, totalBlocks: '100' }))).toBeUndefined();
  });

  test('a monitor opens at the start of its run, with the backlog as its total', ({ expect }) => {
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
      current: 0,
      total: 12,
      synced: 98,
      note: '4 objects · ↓6 ↑2',
    });
  });

  test('against its baseline, a monitor counts what the run has synced', ({ expect }) => {
    const update = toSpaceUpdate(
      'Notes',
      makeState({ totalDocumentCount: 10, unsyncedDocumentCount: 1, totalBlocks: '100', blocksToPull: '3' }),
      98,
    );
    expect(update).toEqual({
      label: 'Syncing Notes',
      current: 8,
      total: 12,
      synced: 106,
      note: '1 objects · ↓3 ↑0',
    });
  });

  test('a backlog that grows extends the total without moving the count backwards', ({ expect }) => {
    const update = toSpaceUpdate('Notes', makeState({ totalDocumentCount: 20, unsyncedDocumentCount: 8 }), 10);
    expect(update).toMatchObject({ current: 2, total: 10, synced: 12 });
  });

  test('unsynced documents alone keep the meter up', ({ expect }) => {
    expect(toSpaceUpdate(undefined, makeState({ unsyncedDocumentCount: 3 }))).toEqual({
      label: 'Syncing Space',
      current: 0,
      total: 3,
      synced: 0,
      note: '3 objects',
    });
  });

  test('feed blocks alone keep the meter up', ({ expect }) => {
    expect(toSpaceUpdate('Notes', makeState({ totalBlocks: '10', blocksToPush: '2' }))).toEqual({
      label: 'Syncing Notes',
      current: 0,
      total: 2,
      synced: 8,
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
