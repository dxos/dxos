//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Fiber from 'effect/Fiber';
import * as Scope from 'effect/Scope';
import * as Stream from 'effect/Stream';

import { Capabilities, Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';
import { ServiceResolver } from '@dxos/compute';
import { Database } from '@dxos/echo';
import { type SpaceId } from '@dxos/keys';
// Explicit import so the emitted `.d.ts` references the package via its public
// alias instead of a relative `node_modules` path (TS2883).
// eslint-disable-next-line unused-imports/no-unused-imports
import type { Progress } from '@dxos/progress';

import { ClientCapabilities } from '#types';

import { createSpaceFeedReplicationProgressKey, createSpaceReplicationProgressKey } from '../progress';

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
    const client = yield* ClientCapabilities.Client;
    const registry = yield* AppCapabilities.ProgressRegistry;
    const processManagerRuntime = yield* Capabilities.ProcessManagerRuntime;

    const monitors = new Map<string, AppCapabilities.ProgressMonitor>();

    yield* Effect.addFinalizer(() =>
      Effect.sync(() => {
        for (const monitor of monitors.values()) {
          monitor.remove();
        }
        monitors.clear();
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

    const runtime = yield* Effect.runtime<Scope.Scope>();
    const subscribeSpace = (spaceId: SpaceId, name?: string): void =>
      void Effect.gen(function* () {
        const fiber = processManagerRuntime.runFork(
          Database.subscribeToSyncState().pipe(
            Stream.runForEach(
              Effect.fnUntraced(function* (state) {
                applyMonitor(createSpaceReplicationProgressKey(spaceId), toDocumentUpdate(name, state));
                applyMonitor(createSpaceFeedReplicationProgressKey(spaceId), toFeedUpdate(name, state));
              }),
            ),
            Effect.provide(ServiceResolver.provide({ space: spaceId }, Database.Service)),
          ),
        );

        yield* Effect.addFinalizer(() => Fiber.interrupt(fiber));
      }).pipe(Effect.provide(runtime), Effect.runFork);

    const spacesSubscription = client.spaces.subscribe((spaces) => {
      for (const space of spaces) {
        subscribeSpace(space.id, space.properties.name);
      }
    });
    yield* Effect.addFinalizer(() => Effect.sync(() => spacesSubscription.unsubscribe()));
    for (const space of client.spaces.get()) {
      subscribeSpace(space.id, space.properties.name);
    }

    return [];
  }),
);

/** Derives the automerge document monitor state, or `undefined` when caught up. */
const toDocumentUpdate = (name: string | undefined, state: Database.SyncState): MonitorUpdate | undefined => {
  const unsynced = state.unsyncedDocumentCount;
  if (unsynced === 0) {
    return undefined;
  }

  const total = state.totalDocumentCount > 0 ? state.totalDocumentCount : unsynced;
  return {
    label: getSpaceProgressLabel(name ?? 'Space', 'CRDTs'),
    current: Math.max(0, total - unsynced),
    total,
  };
};

/** Derives the ECHO feed block monitor state, or `undefined` when caught up. */
const toFeedUpdate = (name: string | undefined, state: Database.SyncState): MonitorUpdate | undefined => {
  const blocksToPull = Number(state.blocksToPull);
  const blocksToPush = Number(state.blocksToPush);
  const pending = blocksToPull + blocksToPush;
  if (pending === 0) {
    return undefined;
  }

  const totalBlocks = Number(state.totalBlocks);
  const total = totalBlocks > 0 ? totalBlocks : pending;
  return {
    label: getSpaceProgressLabel(name ?? 'Space', 'Feeds'),
    current: Math.max(0, total - pending),
    total,
    note: `↓${blocksToPull} ↑${blocksToPush}`,
  };
};

/** Human label for a space progress monitor. */
const getSpaceProgressLabel = (name: string | undefined, suffix?: string): string => {
  const name_ = name ?? 'Space';
  return suffix ? `${name_} · ${suffix}` : name_;
};
