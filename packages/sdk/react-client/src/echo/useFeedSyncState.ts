//
// Copyright 2026 DXOS.org
//

import { useEffect, useState } from 'react';

import { type SpaceId } from '@dxos/keys';

import { useClient } from '../client';

const DEFAULT_POLL_INTERVAL_MS = 5_000;

export type FeedSyncState = {
  /** Combined blocks to pull + push across namespaces. */
  pending: number;
  /** Total blocks stored locally across namespaces. */
  total: number;
};

export type FeedSyncStateMap = Record<SpaceId, FeedSyncState>;

/**
 * Polls queue replication state per space.
 */
export const useFeedSyncState = (pollIntervalMs = DEFAULT_POLL_INTERVAL_MS): FeedSyncStateMap => {
  const client = useClient();
  const [feedSyncState, setFeedSyncState] = useState<FeedSyncStateMap>({});

  useEffect(() => {
    const queueService = client.services.services.QueueService;
    if (!queueService) {
      return;
    }

    let cancelled = false;

    const poll = async () => {
      const spaces = client.spaces.get();
      const entries = await Promise.all(
        spaces.map(async (space) => {
          try {
            const response = await queueService.getSyncState({ spaceId: space.id });
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

    void poll();
    const interval = setInterval(() => void poll(), pollIntervalMs);

    const spacesSubscription = client.spaces.subscribe(() => {
      void poll();
    });

    return () => {
      cancelled = true;
      clearInterval(interval);
      spacesSubscription.unsubscribe();
    };
  }, [client, pollIntervalMs]);

  return feedSyncState;
};
