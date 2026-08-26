//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Effect from 'effect/Effect';
import type * as Atom from 'effect/unstable/reactivity/Atom';
import type * as Registry from 'effect/unstable/reactivity/AtomRegistry';
import localforage from 'localforage';

import { log } from '@dxos/log';
import { type Text } from '@dxos/schema';

import { meta } from '#meta';
import { FileSystemCapabilities } from '#types';

import { refreshWorkspace } from '../../util';
import type { DirectoryWatcher } from './directory-watcher';
import type { MarkdownDocuments } from './markdown-documents';
import type { MirrorSpaceManager } from './mirror-space-manager';

const STORAGE_KEY = `${meta.profile.key}.workspaces`;

/** Load workspace list from local storage, returning an empty array on failure. */
export const loadPersistedWorkspaces = (): Effect.Effect<FileSystemCapabilities.FileSystemWorkspace[]> =>
  Effect.tryPromise(() => localforage.getItem<FileSystemCapabilities.FileSystemWorkspace[]>(STORAGE_KEY)).pipe(
    Effect.map((stored) => stored ?? []),
    Effect.catch((error) =>
      Effect.sync(() => {
        log.warn('Failed to load persisted workspaces', { error });
        return [];
      }),
    ),
  );

/**
 * Public contract for native filesystem workspace lifecycle and markdown document management.
 */
export interface FileSystemManager {
  /** Per-file reactive generation atom for graph connector invalidation. */
  markdownBindingAtom(fileId: string): Atom.Atom<number>;
  /** Lookup text object by filesystem file id. */
  getByFileId(fileId: string): Text.Text | undefined;
  /** Resolve disk write target from Echo DXN string. */
  getWriteTargetByDXN(dxn: string): { path: string; fileId: string } | undefined;
  /** Start directory watcher, ensure mirror space, and sync markdown for a workspace. */
  activateWorkspace(workspace: FileSystemCapabilities.FileSystemWorkspace): Effect.Effect<void>;
  /** Stop directory watcher and evict all cached markdown documents for a workspace. */
  deactivateWorkspace(workspace: FileSystemCapabilities.FileSystemWorkspace): Effect.Effect<void>;
  /** Evict docs, reload workspace from disk, update state, and resync markdown. */
  refreshWorkspaceContent(workspace: FileSystemCapabilities.FileSystemWorkspace): Effect.Effect<void>;
  /** Persist the current workspace list to local storage. */
  persistState(): Effect.Effect<void>;
}

/** Create a new FileSystemManager instance. */
export const make = (
  registry: Registry.AtomRegistry,
  stateAtom: Atom.Writable<FileSystemCapabilities.FileSystemState>,
  markdownDocuments: MarkdownDocuments,
  directoryWatcher: DirectoryWatcher,
  mirrorSpaceManager: MirrorSpaceManager,
): FileSystemManager =>
  new FileSystemManagerImpl(registry, stateAtom, markdownDocuments, directoryWatcher, mirrorSpaceManager);

class FileSystemManagerImpl implements FileSystemManager {
  constructor(
    private readonly _registry: Registry.AtomRegistry,
    private readonly _stateAtom: Atom.Writable<FileSystemCapabilities.FileSystemState>,
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

  getWriteTargetByDXN(dxn: string): { path: string; fileId: string } | undefined {
    return this._markdownDocuments.getWriteTargetByDXN(dxn);
  }

  activateWorkspace(workspace: FileSystemCapabilities.FileSystemWorkspace): Effect.Effect<void> {
    return Effect.gen({ self: this }, function* () {
      yield* this._directoryWatcher.startWatching(workspace);
      yield* this._mirrorSpaceManager.getOrCreateSpace(workspace).pipe(Effect.asVoid);
      yield* this._markdownDocuments.syncFromDisk(workspace);
    });
  }

  deactivateWorkspace(workspace: FileSystemCapabilities.FileSystemWorkspace): Effect.Effect<void> {
    return Effect.gen({ self: this }, function* () {
      yield* this._directoryWatcher.stopWatching(workspace.id);
      this._markdownDocuments.evictForWorkspace(workspace);
    });
  }

  refreshWorkspaceContent(workspace: FileSystemCapabilities.FileSystemWorkspace): Effect.Effect<void> {
    return Effect.gen({ self: this }, function* () {
      this._markdownDocuments.evictForWorkspace(workspace);
      const refreshed = yield* refreshWorkspace(workspace);
      if (refreshed) {
        this._registry.update(this._stateAtom, (state) => ({
          ...state,
          workspaces: state.workspaces.map((ws: FileSystemCapabilities.FileSystemWorkspace) =>
            ws.id === workspace.id ? refreshed : ws,
          ),
        }));
        yield* this._markdownDocuments.syncFromDisk(refreshed);
      }
    });
  }

  persistState(): Effect.Effect<void> {
    return Effect.gen({ self: this }, function* () {
      const state = this._registry.get(this._stateAtom);
      yield* Effect.tryPromise(() => localforage.setItem(STORAGE_KEY, state.workspaces)).pipe(
        Effect.catch((error) => {
          log.warn('Failed to persist workspace state', { error });
          return Effect.void;
        }),
      );
    });
  }
}
