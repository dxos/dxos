//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';
import { type Space } from '@dxos/client/echo';
import { Context } from '@dxos/context';
import { type Database } from '@dxos/echo';
import { type SpaceId } from '@dxos/keys';

import { ClientCapabilities } from '#types';

import {
  createSpaceFeedReplicationProgressKey,
  createSpaceReplicationProgressKey,
  getSpaceProgressLabel,
} from '../progress';

type MonitorUpdate = {
  readonly label: string;
  readonly current: number;
  readonly total: number;
  readonly note?: string;
};

/**
 * Publishes per-space replication backlog — automerge documents and ECHO feed blocks — into the
 * {@link AppCapabilities.ProgressRegistry}. Subscribes to the combined sync-state stream and drops
 * monitors once a space catches up.
 */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const client = yield* Capability.get(ClientCapabilities.Client);
    const registry = yield* Capability.get(AppCapabilities.ProgressRegistry);

    const syncContext = new Context();
    const subscribedSpaces = new Set<SpaceId>();
    const monitors = new Map<string, AppCapabilities.ProgressMonitor>();

    yield* Effect.addFinalizer(() =>
      Effect.sync(() => {
        void syncContext.dispose();
        for (const monitor of monitors.values()) {
          monitor.remove();
        }
        monitors.clear();
        subscribedSpaces.clear();
      }),
    );

    const applyMonitor = (key: string, update: MonitorUpdate | undefined): void => {
      if (update === undefined) {
        monitors.get(key)?.remove();
        monitors.delete(key);
        return;
      }

      let monitor = monitors.get(key);
      if (!monitor) {
        monitor = registry.register(key, { label: update.label, total: update.total });
        monitors.set(key, monitor);
      }
      monitor.set(update.current);
      monitor.total(update.total);
      if (update.note !== undefined) {
        monitor.note(update.note);
      }
    };

    const applySyncState = (space: Space, state: Database.SyncState): void => {
      applyMonitor(createSpaceReplicationProgressKey(space.id), toDocumentUpdate(space, state));
      applyMonitor(createSpaceFeedReplicationProgressKey(space.id), toFeedUpdate(space, state));
    };

    const subscribeSpace = (space: Space): void => {
      if (subscribedSpaces.has(space.id)) {
        return;
      }
      subscribedSpaces.add(space.id);

      syncContext.onDispose(space.internal.db.subscribeToSyncState((state) => applySyncState(space, state)));
    };

    for (const space of client.spaces.get()) {
      subscribeSpace(space);
    }

    const spacesSubscription = client.spaces.subscribe((spaces) => {
      for (const space of spaces) {
        subscribeSpace(space);
      }
    });

    yield* Effect.addFinalizer(() => Effect.sync(() => spacesSubscription.unsubscribe()));
  }),
);

/** Derives the automerge document monitor state, or `undefined` when caught up. */
const toDocumentUpdate = (space: Space, state: Database.SyncState): MonitorUpdate | undefined => {
  const unsynced = state.unsyncedDocumentCount;
  if (unsynced === 0) {
    return undefined;
  }

  const total = state.totalDocumentCount > 0 ? state.totalDocumentCount : unsynced;
  return {
    label: getSpaceProgressLabel(space, 'CRDTs'),
    current: Math.max(0, total - unsynced),
    total,
  };
};

/** Derives the ECHO feed block monitor state, or `undefined` when caught up. */
const toFeedUpdate = (space: Space, state: Database.SyncState): MonitorUpdate | undefined => {
  const blocksToPull = Number(state.blocksToPull);
  const blocksToPush = Number(state.blocksToPush);
  const pending = blocksToPull + blocksToPush;
  if (pending === 0) {
    return undefined;
  }

  const totalBlocks = Number(state.totalBlocks);
  const total = totalBlocks > 0 ? totalBlocks : pending;
  return {
    label: getSpaceProgressLabel(space, 'Feeds'),
    current: Math.max(0, total - pending),
    total,
    note: `↓${blocksToPull} ↑${blocksToPush}`,
  };
};
