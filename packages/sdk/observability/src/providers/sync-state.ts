//
// Copyright 2026 DXOS.org
//

import { type Client } from '@dxos/client';
import { type Space } from '@dxos/client/echo';
import { type Context } from '@dxos/context';
import { type Database } from '@dxos/echo';
import { log } from '@dxos/log';

/**
 * Sync backlog folded across every space, as read at collection time.
 * Feed blocks are `string` on the wire (they exceed the safe integer range in principle), so they
 * are summed as `number` here — a backlog large enough to lose precision is already pathological.
 */
export type SyncSummary = {
  localDocumentCount: number;
  remoteDocumentCount: number;
  unsyncedDocumentCount: number;
  blocksToPull: number;
  blocksToPush: number;
  /**
   * Total outstanding work, documents and feed blocks together.
   * A client with a stalled feed backlog is not synced even when its documents converged, so this
   * (not `unsyncedDocumentCount`) is what "is this client caught up" means.
   */
  pendingWorkCount: number;
};

const EMPTY: SyncSummary = {
  localDocumentCount: 0,
  remoteDocumentCount: 0,
  unsyncedDocumentCount: 0,
  blocksToPull: 0,
  blocksToPush: 0,
  pendingWorkCount: 0,
};

/**
 * Tracks the sync backlog of every space the client knows about.
 *
 * Reads `db.subscribeToSyncState`, which already selects the EDGE peer and owns a no-change poll
 * backoff, so this adds no timer of its own — a second ticker here would re-create the idle churn
 * that backoff exists to remove.
 */
export const subscribeSyncSummary = (client: Client, ctx: Context): { summary: () => SyncSummary } => {
  const states = new Map<string, Database.SyncState>();
  const cleanups = new Map<string, () => void>();

  const subscribe = (space: Space) => {
    if (cleanups.has(space.id)) {
      return;
    }

    try {
      cleanups.set(
        space.id,
        space.db.subscribeToSyncState((state) => {
          states.set(space.id, state);
        }),
      );
    } catch (err) {
      // A space that is not ready yet has no database to subscribe to; the spaces subscription
      // below re-runs on every update, so it will be picked up once it opens.
      log('sync state subscription deferred', { space: space.id, err });
    }
  };

  for (const space of client.spaces.get()) {
    subscribe(space);
  }

  const subscription = client.spaces.subscribe({
    next: (spaces) => {
      for (const space of spaces) {
        subscribe(space);
      }
    },
  });

  ctx.onDispose(() => {
    subscription.unsubscribe();
    for (const cleanup of cleanups.values()) {
      cleanup();
    }
    cleanups.clear();
    states.clear();
  });

  return { summary: () => foldSyncStates(states.values()) };
};

/** Folds per-space sync state into one device-wide summary. */
export const foldSyncStates = (states: Iterable<Database.SyncState>): SyncSummary => {
  const summary = { ...EMPTY };
  for (const state of states) {
    summary.localDocumentCount += state.localDocumentCount;
    summary.remoteDocumentCount += state.remoteDocumentCount;
    summary.unsyncedDocumentCount += state.unsyncedDocumentCount;
    summary.blocksToPull += Number(state.blocksToPull);
    summary.blocksToPush += Number(state.blocksToPush);
  }
  summary.pendingWorkCount = summary.unsyncedDocumentCount + summary.blocksToPull + summary.blocksToPush;
  return summary;
};
