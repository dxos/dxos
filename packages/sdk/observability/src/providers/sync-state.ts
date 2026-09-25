//
// Copyright 2026 DXOS.org
//

import { type CleanupFn } from '@dxos/async';
import { type Client } from '@dxos/client';
import { type Space } from '@dxos/client/echo';
import { type Context } from '@dxos/context';
import { type Database } from '@dxos/echo';
import { log } from '@dxos/log';

/** Sync backlog folded across every space. Feed blocks arrive as strings and are summed numerically. */
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
 * Holds the latest sync state per space.
 * Separate from the client subscription so the add/remove/fold behaviour is testable on its own.
 */
export class SyncStateTracker {
  readonly #states = new Map<string, Database.SyncState>();
  readonly #cleanups = new Map<string, CleanupFn>();
  readonly #onChange: ((summary: SyncSummary) => void) | undefined;

  constructor(onChange?: (summary: SyncSummary) => void) {
    this.#onChange = onChange;
  }

  get trackedIds(): string[] {
    return [...this.#cleanups.keys()];
  }

  isTracked(spaceId: string): boolean {
    return this.#cleanups.has(spaceId);
  }

  /** Registers a space, ignoring one already tracked so a repeated update does not double-subscribe. */
  add(spaceId: string, subscribe: (onState: (state: Database.SyncState) => void) => CleanupFn): void {
    if (this.#cleanups.has(spaceId)) {
      return;
    }

    this.#cleanups.set(
      spaceId,
      subscribe((state) => {
        this.#states.set(spaceId, state);
        this.#onChange?.(this.summary());
      }),
    );
  }

  remove(spaceId: string): void {
    this.#cleanups.get(spaceId)?.();
    this.#cleanups.delete(spaceId);
    this.#states.delete(spaceId);
  }

  /** Drops every space absent from `spaceIds`, whose last backlog would otherwise persist in the summary. */
  retainOnly(spaceIds: Iterable<string>): void {
    const present = new Set(spaceIds);
    for (const spaceId of this.trackedIds) {
      if (!present.has(spaceId)) {
        this.remove(spaceId);
      }
    }
  }

  clear(): void {
    for (const spaceId of this.trackedIds) {
      this.remove(spaceId);
    }
  }

  summary(): SyncSummary {
    return foldSyncStates(this.#states.values());
  }
}

/**
 * Tracks the sync backlog of every space the client knows about.
 *
 * Reads `db.subscribeToSyncState`, which already selects the EDGE peer and owns a no-change poll
 * backoff, so this adds no timer of its own.
 */
export const subscribeSyncSummary = (
  client: Client,
  ctx: Context,
  onChange?: (summary: SyncSummary) => void,
): { summary: () => SyncSummary } => {
  const tracker = new SyncStateTracker(onChange);

  const reconcile = (spaces: Space[]) => {
    tracker.retainOnly(spaces.map((space) => space.id));
    for (const space of spaces) {
      if (tracker.isTracked(space.id)) {
        continue;
      }

      try {
        tracker.add(space.id, (onState) => space.db.subscribeToSyncState(onState));
      } catch (err) {
        // A space that is not ready has no database yet; the subscription below re-runs on every
        // update, so it is picked up once it opens.
        log('sync state subscription deferred', { space: space.id, err });
      }
    }
  };

  reconcile(client.spaces.get());
  const subscription = client.spaces.subscribe({ next: reconcile });

  ctx.onDispose(() => {
    subscription.unsubscribe();
    tracker.clear();
  });

  return { summary: () => tracker.summary() };
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
