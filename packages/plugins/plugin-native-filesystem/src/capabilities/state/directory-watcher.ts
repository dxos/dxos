//
// Copyright 2025 DXOS.org
//

import type { WatchEvent } from '@tauri-apps/plugin-fs';

import * as Effect from 'effect/Effect';

import { debounce } from '@dxos/async';

import { watchDirectory } from './disk-io';

import type { FilesystemWorkspace } from '../../types';

const WATCHER_DEBOUNCE_MS = 500;

/**
 * A watcher transitions through: pending → active.
 * `pending` means the Tauri watch call is in-flight but hasn't resolved yet.
 * `active` means the native watcher is live and holds a teardown handle.
 */
type DirectoryWatcherState =
  | { _tag: 'pending' }
  | {
      _tag: 'active';
      unwatch: () => void;
    };

export type DirectoryWatcher = {
  startWatching: (workspace: FilesystemWorkspace) => Effect.Effect<void>;
  stopWatching: (workspaceId: string) => Effect.Effect<void>;
  stopAll: () => Effect.Effect<void>;
};

/**
 * Manages per-workspace native filesystem watchers via Tauri.
 *
 * Two parallel data structures handle the race between async watcher setup and
 * user-initiated stop:
 *  - `enabledWatchers` tracks which workspaces *should* be watched right now.
 *  - `watchers` tracks the lifecycle state of each Tauri watcher (pending / active).
 *
 * When a watcher finishes setup, it checks `enabledWatchers` to decide whether
 * to activate or immediately tear down (the user may have closed the workspace
 * while the watcher was still being created).
 */
export const createDirectoryWatcher = (onRefresh: (workspaceId: string) => Effect.Effect<void>): DirectoryWatcher => {
  // Workspaces that should currently be watched. Guards against delivering events after stop.
  const enabledWatchers = new Set<string>();
  // Lifecycle state of each Tauri watcher, keyed by workspace id.
  const watchers = new Map<string, DirectoryWatcherState>();

  const removeWatcher = (workspaceId: string): void => {
    const watcher = watchers.get(workspaceId);
    watchers.delete(workspaceId);
    if (watcher?._tag === 'active') {
      watcher.unwatch();
    }
  };

  const startWatching = (workspace: FilesystemWorkspace): Effect.Effect<void> =>
    Effect.gen(function* () {
      enabledWatchers.add(workspace.id);
      if (watchers.get(workspace.id)) {
        return;
      }

      // Mark as pending so a concurrent startWatching call won't double-subscribe.
      watchers.set(workspace.id, { _tag: 'pending' });
      const debouncedRefresh = debounce((_event: WatchEvent) => {
        void Effect.runFork(onRefresh(workspace.id));
      }, WATCHER_DEBOUNCE_MS);

      const unwatch = yield* watchDirectory(workspace.path, (event) =>
        Effect.sync(() => {
          // Only forward events if the workspace is still enabled (may have been
          // stopped while a debounced event was queued).
          if (enabledWatchers.has(workspace.id)) {
            debouncedRefresh(event);
          }
        }),
      );
      if (unwatch) {
        // The workspace may have been stopped while the async watch call was in
        // flight. If it's still enabled and still in the pending state, promote
        // to active; otherwise tear down immediately.
        if (enabledWatchers.has(workspace.id) && watchers.get(workspace.id)?._tag === 'pending') {
          watchers.set(workspace.id, { _tag: 'active', unwatch });
        } else {
          unwatch();
        }
      }
    }).pipe(
      // If watchDirectory threw or returned null, clean up the pending entry so
      // a future startWatching call can retry.
      Effect.ensuring(
        Effect.sync(() => {
          if (watchers.get(workspace.id)?._tag === 'pending') {
            watchers.delete(workspace.id);
          }
        }),
      ),
    );

  const stopWatching = (workspaceId: string): Effect.Effect<void> =>
    Effect.sync(() => {
      enabledWatchers.delete(workspaceId);
      removeWatcher(workspaceId);
    });

  const stopAll = (): Effect.Effect<void> =>
    Effect.gen(function* () {
      const workspaceIds = Array.from(enabledWatchers);
      enabledWatchers.clear();
      yield* Effect.forEach(workspaceIds, stopWatching, { discard: true });
    });

  return { startWatching, stopWatching, stopAll };
};
