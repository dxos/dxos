//
// Copyright 2025 DXOS.org
//

import type { WatchEvent } from '@tauri-apps/plugin-fs';

import * as Effect from 'effect/Effect';

import { debounce } from '@dxos/async';

import { watchDirectory } from './disk-io';

import type { FilesystemWorkspace } from '../../types';

const WATCHER_DEBOUNCE_MS = 500;

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

export const createDirectoryWatcher = (onRefresh: (workspaceId: string) => Effect.Effect<void>): DirectoryWatcher => {
  const enabledWatchers = new Set<string>();
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

      watchers.set(workspace.id, { _tag: 'pending' });
      const debouncedRefresh = debounce((_event: WatchEvent) => {
        void Effect.runFork(onRefresh(workspace.id));
      }, WATCHER_DEBOUNCE_MS);

      const unwatch = yield* watchDirectory(workspace.path, (event) =>
        Effect.sync(() => {
          if (enabledWatchers.has(workspace.id)) {
            debouncedRefresh(event);
          }
        }),
      );
      if (unwatch) {
        if (enabledWatchers.has(workspace.id) && watchers.get(workspace.id)?._tag === 'pending') {
          watchers.set(workspace.id, { _tag: 'active', unwatch });
        } else {
          unwatch();
        }
      }
    }).pipe(
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
