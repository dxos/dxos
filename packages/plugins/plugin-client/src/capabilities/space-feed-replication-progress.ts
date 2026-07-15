//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';
import { type Space } from '@dxos/client/echo';

import { ClientCapabilities } from '#types';

import {
  ProgressMonitorBridge,
  aggregateFeedSyncState,
  createSpaceFeedReplicationProgressKey,
  formatFeedSyncNote,
  getSpaceProgressLabel,
  type FeedNamespaceSyncEntry,
} from '../progress';

const IDLE_POLL_INTERVAL_MS = 5_000;
const ACTIVE_POLL_INTERVAL_MS = 1_000;

/**
 * Publishes per-space ECHO feed block replication backlog into {@link AppCapabilities.ProgressRegistry}.
 * Polls {@link FeedService.getSyncState} and removes monitors when all namespaces are caught up.
 */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const client = yield* Capability.get(ClientCapabilities.Client);
    const registries = yield* Capability.getAll(AppCapabilities.ProgressRegistry);
    if (registries.length === 0) {
      return;
    }

    const feedService = client.services.services.FeedService;
    if (!feedService) {
      return;
    }

    const bridge = new ProgressMonitorBridge(registries);
    let pollIntervalMs = IDLE_POLL_INTERVAL_MS;
    let pollTimer: ReturnType<typeof setInterval> | undefined;
    let cancelled = false;

    yield* Effect.addFinalizer(() =>
      Effect.sync(() => {
        cancelled = true;
        if (pollTimer) {
          clearInterval(pollTimer);
          pollTimer = undefined;
        }
        bridge.clear();
      }),
    );

    const applyFeedState = (space: Space, namespaces: readonly FeedNamespaceSyncEntry[]): void => {
      const key = createSpaceFeedReplicationProgressKey(space.id);
      const aggregate = aggregateFeedSyncState(namespaces);
      if (aggregate.pending === 0) {
        bridge.remove(key);
        return;
      }

      const total = aggregate.total > 0 ? aggregate.total : aggregate.pending;
      const current = Math.max(0, total - aggregate.pending);

      bridge.update(key, {
        label: getSpaceProgressLabel(space, 'Feeds'),
        current,
        total,
        note: formatFeedSyncNote(namespaces),
      });
    };

    const pollSpace = async (space: Space): Promise<boolean> => {
      try {
        const response = await feedService.getSyncState({ spaceId: space.id });
        const namespaces = response.namespaces ?? [];
        applyFeedState(space, namespaces);
        return aggregateFeedSyncState(namespaces).pending > 0;
      } catch {
        bridge.remove(createSpaceFeedReplicationProgressKey(space.id));
        return false;
      }
    };

    const schedulePoll = (): void => {
      if (pollTimer) {
        clearInterval(pollTimer);
      }
      pollTimer = setInterval(() => {
        void pollAll();
      }, pollIntervalMs);
    };

    const pollAll = async (): Promise<void> => {
      if (cancelled) {
        return;
      }

      const spaces = client.spaces.get();
      const pendingFlags = await Promise.all(spaces.map((space) => pollSpace(space)));
      const anyPending = pendingFlags.some(Boolean);
      const nextIntervalMs = anyPending ? ACTIVE_POLL_INTERVAL_MS : IDLE_POLL_INTERVAL_MS;
      if (nextIntervalMs !== pollIntervalMs) {
        pollIntervalMs = nextIntervalMs;
        schedulePoll();
      }
    };

    schedulePoll();
    void pollAll();

    const spacesSubscription = client.spaces.subscribe(() => {
      void pollAll();
    });

    yield* Effect.addFinalizer(() => Effect.sync(() => spacesSubscription.unsubscribe()));
  }),
);
