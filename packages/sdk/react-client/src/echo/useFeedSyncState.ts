//
// Copyright 2026 DXOS.org
//

import { useEffect, useState } from 'react';

import { type SpaceId } from '@dxos/keys';

import { useClient } from '../client/index.ts';

// Each poll issues a `peekPull` round-trip to edge per space per namespace, so a stats readout polls
// an order of magnitude slower than the data path it observes.
const DEFAULT_POLL_INTERVAL_MS = 15_000;

export type FeedSyncState = {
  /** Combined blocks to pull + push across namespaces. */
  pending: number;
  /** Total blocks stored locally across namespaces. */
  total: number;
};

export type FeedSyncStateMap = Record<SpaceId, FeedSyncState>;

const isDocumentVisible = (): boolean => globalThis.document?.visibilityState !== 'hidden';

/**
 * Polls feed replication state per space, while the document is visible.
 */
export const useFeedSyncState = (pollIntervalMs = DEFAULT_POLL_INTERVAL_MS): FeedSyncStateMap => {
  const client = useClient();
  const [feedSyncState, setFeedSyncState] = useState<FeedSyncStateMap>({});

  useEffect(() => {
    const feedService = client.services.services.FeedService;
    if (!feedService) {
      return;
    }

    let cancelled = false;
    let interval: ReturnType<typeof setInterval> | undefined;

    const poll = async () => {
      const spaces = client.spaces.get();
      const entries = await Promise.all(
        spaces.map(async (space) => {
          try {
            const response = await feedService.getSyncState({ spaceId: space.id });
            const state = (response.namespaces ?? []).reduce<FeedSyncState>(
              (acc, entry) => {
                acc.pending += Number(entry.blocksToPull ?? 0) + Number(entry.blocksToPush ?? 0);
                acc.total += Number(entry.totalBlocks ?? 0);
                return acc;
              },
              { pending: 0, total: 0 },
            );
            return [space.id, state] as const;
          } catch {
            return [space.id, { pending: 0, total: 0 }] as const;
          }
        }),
      );

      if (!cancelled) {
        setFeedSyncState(Object.fromEntries(entries));
      }
    };

    // Polling resumes with an immediate poll so the readout is not stale for a whole interval.
    const start = () => {
      if (interval !== undefined) {
        return;
      }
      void poll();
      interval = setInterval(() => void poll(), pollIntervalMs);
    };

    const stop = () => {
      if (interval === undefined) {
        return;
      }
      clearInterval(interval);
      interval = undefined;
    };

    const handleVisibilityChange = () => (isDocumentVisible() ? start() : stop());

    if (isDocumentVisible()) {
      start();
    }

    const document = globalThis.document;
    document?.addEventListener('visibilitychange', handleVisibilityChange);

    const spacesSubscription = client.spaces.subscribe(() => {
      if (isDocumentVisible()) {
        void poll();
      }
    });

    return () => {
      cancelled = true;
      stop();
      document?.removeEventListener('visibilitychange', handleVisibilityChange);
      spacesSubscription.unsubscribe();
    };
  }, [client, pollIntervalMs]);

  return feedSyncState;
};
