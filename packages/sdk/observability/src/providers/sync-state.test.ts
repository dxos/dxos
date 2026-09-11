//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { type Database } from '@dxos/echo';

import { SyncStateTracker, foldSyncStates } from './sync-state.ts';

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

describe('SyncStateTracker', () => {
  /** Returns a subscribe fn plus the handle to push states and observe teardown. */
  const spaceSource = () => {
    const source = {
      push: (_state: Database.SyncState) => {},
      cleanedUp: false,
      subscribe: (onState: (state: Database.SyncState) => void) => {
        source.push = onState;
        return () => {
          source.cleanedUp = true;
        };
      },
    };
    return source;
  };

  test('sums the spaces it is tracking', () => {
    const tracker = new SyncStateTracker();
    const first = spaceSource();
    const second = spaceSource();
    tracker.add('space-1', first.subscribe);
    tracker.add('space-2', second.subscribe);

    first.push(state({ unsyncedDocumentCount: 3 }));
    second.push(state({ unsyncedDocumentCount: 4 }));

    expect(tracker.summary().unsyncedDocumentCount).toEqual(7);
  });

  test('adding a tracked space again does not double-subscribe', () => {
    const tracker = new SyncStateTracker();
    const source = spaceSource();
    tracker.add('space-1', source.subscribe);

    let secondSubscribeCalls = 0;
    tracker.add('space-1', (onState) => {
      secondSubscribeCalls++;
      return () => onState;
    });

    expect(secondSubscribeCalls).toEqual(0);
    expect(tracker.trackedIds).toEqual(['space-1']);
  });

  test('a removed space stops contributing and is unsubscribed', () => {
    const tracker = new SyncStateTracker();
    const source = spaceSource();
    tracker.add('space-1', source.subscribe);
    source.push(state({ unsyncedDocumentCount: 5, blocksToPull: '2' }));
    expect(tracker.summary().pendingWorkCount).toEqual(7);

    tracker.remove('space-1');

    // Without this the space's last backlog persists and the summary reports work that is gone.
    expect(tracker.summary().pendingWorkCount).toEqual(0);
    expect(source.cleanedUp).toEqual(true);
    expect(tracker.trackedIds).toEqual([]);
  });

  test('retainOnly drops spaces absent from the client list', () => {
    const tracker = new SyncStateTracker();
    const kept = spaceSource();
    const dropped = spaceSource();
    tracker.add('space-kept', kept.subscribe);
    tracker.add('space-dropped', dropped.subscribe);
    kept.push(state({ unsyncedDocumentCount: 1 }));
    dropped.push(state({ unsyncedDocumentCount: 9 }));

    tracker.retainOnly(['space-kept']);

    expect(tracker.trackedIds).toEqual(['space-kept']);
    expect(tracker.summary().unsyncedDocumentCount).toEqual(1);
    expect(dropped.cleanedUp).toEqual(true);
    expect(kept.cleanedUp).toEqual(false);
  });

  test('retainOnly keeps everything when nothing was removed', () => {
    const tracker = new SyncStateTracker();
    const source = spaceSource();
    tracker.add('space-1', source.subscribe);
    source.push(state({ unsyncedDocumentCount: 2 }));

    tracker.retainOnly(['space-1', 'space-2']);

    expect(tracker.trackedIds).toEqual(['space-1']);
    expect(tracker.summary().unsyncedDocumentCount).toEqual(2);
    expect(source.cleanedUp).toEqual(false);
  });

  test('clear unsubscribes every space', () => {
    const tracker = new SyncStateTracker();
    const first = spaceSource();
    const second = spaceSource();
    tracker.add('space-1', first.subscribe);
    tracker.add('space-2', second.subscribe);

    tracker.clear();

    expect(first.cleanedUp).toEqual(true);
    expect(second.cleanedUp).toEqual(true);
    expect(tracker.summary().pendingWorkCount).toEqual(0);
  });
});
