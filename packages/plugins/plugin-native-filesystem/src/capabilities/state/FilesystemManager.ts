//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import { type Atom, type Registry } from '@effect-atom/atom-react';
import * as Effect from 'effect/Effect';
import localforage from 'localforage';

import { log } from '@dxos/log';
import { type Text } from '@dxos/schema';

import { meta } from '#meta';
import type { FilesystemWorkspace, NativeFilesystemState } from '#types';

import { refreshWorkspace } from '../../util';
import type { DirectoryWatcher } from './directory-watcher';
import type { MarkdownDocuments } from './markdown-documents';
import type { MirrorSpaceManager } from './mirror-space-manager';

const STORAGE_KEY = `${meta.id}.workspaces`;

/** Load workspace list from local storage, returning an empty array on failure. */
export const loadPersistedWorkspaces = (): Effect.Effect<FilesystemWorkspace[]> =>
  Effect.tryPromise(() => localforage.getItem<FilesystemWorkspace[]>(STORAGE_KEY)).pipe(
    Effect.map((stored) => stored ?? []),
    Effect.catchAll((error) =>
      Effect.sync(() => {
        log.warn('Failed to load persisted workspaces', { error });
        return [];
      }),
    ),
  );

/**
 * Public contract for native filesystem workspace lifecycle and markdown document management.
 */
export interface FilesystemManager {
  /** Per-file reactive generation atom for graph connector invalidation. */
  markdownBindingAtom(fileId: string): Atom.Atom<number>;
  /** Lookup text object by filesystem file id. */
  getByFileId(fileId: string): Text.Text | undefined;
  /** Resolve disk write target from Echo DXN string. */
  getWriteTargetByDxn(dxn: string): { path: string; fileId: string } | undefined;
  /** Start directory watcher, ensure mirror space, and sync markdown for a workspace. */
  activateWorkspace(workspace: FilesystemWorkspace): Effect.Effect<void>;
  /** Stop directory watcher and evict all cached markdown documents for a workspace. */
  deactivateWorkspace(workspace: FilesystemWorkspace): Effect.Effect<void>;
  /** Evict docs, reload workspace from disk, update state, and resync markdown. */
  refreshWorkspaceContent(workspace: FilesystemWorkspace): Effect.Effect<void>;
  /** Persist the current workspace list to local storage. */
  persistState(): Effect.Effect<void>;
}

/** Create a new FilesystemManager instance. */
export const make = (
  registry: Registry.Registry,
  stateAtom: Atom.Writable<NativeFilesystemState>,
  markdownDocuments: MarkdownDocuments,
  directoryWatcher: DirectoryWatcher,
  mirrorSpaceManager: MirrorSpaceManager,
): FilesystemManager =>
  new FilesystemManagerImpl(registry, stateAtom, markdownDocuments, directoryWatcher, mirrorSpaceManager);

class FilesystemManagerImpl implements FilesystemManager {
  constructor(
    private readonly _registry: Registry.Registry,
    private readonly _stateAtom: Atom.Writable<NativeFilesystemState>,
    private readonly _markdownDocuments: MarkdownDocuments,
    private readonly _directoryWatcher: DirectoryWatcher,
    private readonly _mirrorSpaceManager: MirrorSpaceManager,
  ) {}

  markdownBindingAtom(fileId: string): Atom.Atom<number> {
    return this._markdownDocuments.markdownBindingAtom(fileId);
  }

  getByFileId(fileId: string): Text.Text | undefined {
    return this._markdownDocuments.getByFileId(fileId);
  }

  getWriteTargetByDxn(dxn: string): { path: string; fileId: string } | undefined {
    return this._markdownDocuments.getWriteTargetByDxn(dxn);
  }

  activateWorkspace(workspace: FilesystemWorkspace): Effect.Effect<void> {
    return Effect.gen(this, function* () {
      yield* this._directoryWatcher.startWatching(workspace);
      yield* this._mirrorSpaceManager.getOrCreateSpace(workspace).pipe(Effect.asVoid);
      yield* this._markdownDocuments.syncFromDisk(workspace);
    });
  }

  deactivateWorkspace(workspace: FilesystemWorkspace): Effect.Effect<void> {
    return Effect.gen(this, function* () {
      yield* this._directoryWatcher.stopWatching(workspace.id);
      this._markdownDocuments.evictForWorkspace(workspace);
    });
  }

  refreshWorkspaceContent(workspace: FilesystemWorkspace): Effect.Effect<void> {
    return Effect.gen(this, function* () {
      this._markdownDocuments.evictForWorkspace(workspace);
      const refreshed = yield* refreshWorkspace(workspace);
      if (refreshed) {
        this._registry.update(this._stateAtom, (state) => ({
          ...state,
          workspaces: state.workspaces.map((ws: FilesystemWorkspace) => (ws.id === workspace.id ? refreshed : ws)),
        }));
        yield* this._markdownDocuments.syncFromDisk(refreshed);
      }
    });
  }

  persistState(): Effect.Effect<void> {
    return Effect.gen(this, function* () {
      const state = this._registry.get(this._stateAtom);
      yield* Effect.tryPromise(() => localforage.setItem(STORAGE_KEY, state.workspaces)).pipe(
        Effect.catchAll((error) => {
          log.warn('Failed to persist workspace state', { error });
          return Effect.void;
        }),
      );
    });
  }
}
