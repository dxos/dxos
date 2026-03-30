//
// Copyright 2025 DXOS.org
//

import type { WatchEvent } from '@tauri-apps/plugin-fs';

import { Atom, type Registry } from '@effect-atom/atom-react';
import * as Effect from 'effect/Effect';
import localforage from 'localforage';

import { Capabilities, Capability } from '@dxos/app-framework';
import { debounce } from '@dxos/async';
import { Obj } from '@dxos/echo';
import { createObject, updateText } from '@dxos/echo-db';
import { log } from '@dxos/log';
import { Text } from '@dxos/schema';

import { meta } from '../../meta';
import {
  NativeFilesystemCapabilities,
  type NativeMarkdownDocumentsService,
  type NativeFilesystemState,
  type FilesystemFile,
  type FilesystemWorkspace,
  type FilesystemEntry,
  isFilesystemFile,
} from '../../types';
import {
  findFileById,
  loadWorkspace,
  readFileContent,
  refreshWorkspace,
  updateFileInWorkspace,
  watchDirectory,
  watchMarkdownFile,
} from '../../util';

const WATCHER_DEBOUNCE_MS = 500;
const STORAGE_KEY = `${meta.id}.workspaces`;

type DirectoryWatcherState =
  | { _tag: 'pending' }
  | {
      _tag: 'active';
      unwatch: () => void;
    };

const loadPersistedWorkspaces = (): Effect.Effect<FilesystemWorkspace[]> =>
  Effect.tryPromise(() => localforage.getItem<FilesystemWorkspace[]>(STORAGE_KEY)).pipe(
    Effect.map((stored) => stored ?? []),
    Effect.catchAll((error) =>
      Effect.sync(() => {
        log.warn('Failed to load persisted workspaces', { error });
        return [];
      }),
    ),
  );

/** Collect all markdown file ids from a tree of entries. */
const collectMarkdownFileIds = (entries: FilesystemEntry[]): string[] => {
  const ids: string[] = [];
  for (const entry of entries) {
    if ('children' in entry) {
      ids.push(...collectMarkdownFileIds(entry.children));
    } else if (isFilesystemFile(entry) && entry.type === 'markdown') {
      ids.push(entry.id);
    }
  }
  return ids;
};

const workspaceContainsPath = (entries: FilesystemEntry[], targetPath: string): boolean => {
  for (const entry of entries) {
    if (entry.path === targetPath) {
      return true;
    }
    if ('children' in entry && workspaceContainsPath(entry.children, targetPath)) {
      return true;
    }
  }
  return false;
};

const createNativeMarkdownDocumentsService = (
  registry: Registry.Registry,
  stateAtom: Atom.Writable<NativeFilesystemState>,
): NativeMarkdownDocumentsService => {
  const documentsByFileId = new Map<string, Text.Text>();
  const writeTargetByDxn = new Map<string, { path: string; fileId: string }>();
  const dxnByFileId = new Map<string, string>();
  const unwatchByFileId = new Map<string, () => void>();
  const watchStartPending = new Set<string>();

  const indexDocument = (fileId: string, path: string, doc: Text.Text): void => {
    const dxn = Obj.getDXN(doc).toString();
    documentsByFileId.set(fileId, doc);
    writeTargetByDxn.set(dxn, { path, fileId });
    dxnByFileId.set(fileId, dxn);
  };

  const applyExternalDiskText = (fileId: string, path: string): Effect.Effect<void> =>
    Effect.gen(function* () {
      const doc = documentsByFileId.get(fileId);
      if (!doc) {
        return;
      }

      const diskText = yield* readFileContent(path);
      if (diskText === undefined) {
        return;
      }

      const current = doc.content ?? '';
      if (diskText === current) {
        return;
      }

      registry.update(stateAtom, (currentState: NativeFilesystemState) => {
        const result = findFileById(currentState.workspaces, fileId);
        if (!result) {
          return currentState;
        }
        const { workspace } = result;
        return {
          ...currentState,
          workspaces: currentState.workspaces.map((ws: FilesystemWorkspace) =>
            ws.id === workspace.id ? updateFileInWorkspace(ws, fileId, { text: diskText, modified: false }) : ws,
          ),
        };
      });

      updateText(doc, ['content'], diskText);
    });

  const startFileWatcher = (file: FilesystemFile): Effect.Effect<void> =>
    Effect.gen(function* () {
      const unwatch = yield* watchMarkdownFile(file.path, () => applyExternalDiskText(file.id, file.path));
      if (!unwatch) {
        return;
      }
      if (!documentsByFileId.has(file.id)) {
        unwatch();
        return;
      }
      unwatchByFileId.set(file.id, unwatch);
    }).pipe(
      Effect.ensuring(
        Effect.sync(() => {
          watchStartPending.delete(file.id);
        }),
      ),
    );

  const ensureFileWatcher = (file: FilesystemFile): void => {
    if (unwatchByFileId.has(file.id) || watchStartPending.has(file.id)) {
      return;
    }

    watchStartPending.add(file.id);
    void Effect.runFork(startFileWatcher(file));
  };

  return {
    getOrCreate: (file: FilesystemFile): Text.Text => {
      const existing = documentsByFileId.get(file.id);
      if (existing) {
        indexDocument(file.id, file.path, existing);
        ensureFileWatcher(file);
        return existing;
      }

      const doc = createObject(Text.make(file.text ?? ''));
      indexDocument(file.id, file.path, doc);
      ensureFileWatcher(file);
      return doc;
    },

    getByFileId: (fileId: string): Text.Text | undefined => {
      return documentsByFileId.get(fileId);
    },

    getWriteTargetByDxn: (dxn: string): { path: string; fileId: string } | undefined => {
      return writeTargetByDxn.get(dxn);
    },

    getDxnForFileId: (fileId: string): string | undefined => {
      return dxnByFileId.get(fileId);
    },

    evictForWorkspace: (workspace: FilesystemWorkspace): void => {
      const fileIds = collectMarkdownFileIds(workspace.children);
      for (const fileId of fileIds) {
        watchStartPending.delete(fileId);
        const unwatch = unwatchByFileId.get(fileId);
        if (unwatch) {
          unwatch();
          unwatchByFileId.delete(fileId);
        }
        const dxn = dxnByFileId.get(fileId);
        documentsByFileId.delete(fileId);
        dxnByFileId.delete(fileId);
        if (dxn) {
          writeTargetByDxn.delete(dxn);
        }
      }
    },
  };
};

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const registry = yield* Capability.get(Capabilities.AtomRegistry);

    const initialState: NativeFilesystemState = {
      workspaces: [],
      currentFile: undefined,
    };

    const stateAtom = Atom.make<NativeFilesystemState>(initialState).pipe(Atom.keepAlive);

    const persistedWorkspaces = yield* loadPersistedWorkspaces();
    if (persistedWorkspaces.length > 0) {
      const refreshed = yield* Effect.forEach(persistedWorkspaces, (workspace) =>
        loadWorkspace(workspace.path).pipe(Effect.map((latest) => latest ?? workspace)),
      );
      registry.update(stateAtom, (current) => ({
        ...current,
        workspaces: refreshed,
      }));
    }

    const nativeMarkdownDocuments = createNativeMarkdownDocumentsService(registry, stateAtom);

    const enabledDirectoryWatchers = new Set<string>();
    const directoryWatchers = new Map<string, DirectoryWatcherState>();

    const isDirectoryWatcherEnabled = (workspaceId: string): boolean => enabledDirectoryWatchers.has(workspaceId);

    const getDirectoryWatcher = (workspaceId: string): DirectoryWatcherState | undefined =>
      directoryWatchers.get(workspaceId);

    const removeDirectoryWatcher = (workspaceId: string): void => {
      const watcher = directoryWatchers.get(workspaceId);
      directoryWatchers.delete(workspaceId);
      if (watcher?._tag === 'active') {
        watcher.unwatch();
      }
    };

    const shouldActivateDirectoryWatcher = (workspaceId: string): boolean => {
      return isDirectoryWatcherEnabled(workspaceId) && getDirectoryWatcher(workspaceId)?._tag === 'pending';
    };

    const markDirectoryWatcherPending = (workspaceId: string): void => {
      directoryWatchers.set(workspaceId, { _tag: 'pending' });
    };

    const activateDirectoryWatcher = (workspaceId: string, unwatch: () => void): void => {
      if (!shouldActivateDirectoryWatcher(workspaceId)) {
        unwatch();
        return;
      }

      directoryWatchers.set(workspaceId, { _tag: 'active', unwatch });
    };

    const refreshDirectoryWatcher = (workspaceId: string, event: WatchEvent): Effect.Effect<void> =>
      Effect.gen(function* () {
        if (!isDirectoryWatcherEnabled(workspaceId)) {
          return;
        }

        const current = registry.get(stateAtom);
        const currentWorkspace = current.workspaces.find((ws) => ws.id === workspaceId);
        if (!currentWorkspace) {
          return;
        }

        // TODO(wittjosiah): Refresh only the changed branch.
        //   This reloads the entire workspace snapshot, causing connectors to run even for localized changes.
        nativeMarkdownDocuments.evictForWorkspace(currentWorkspace);
        const refreshed = yield* refreshWorkspace(currentWorkspace);
        const includesChangedPaths =
          refreshed && event.paths.length > 0
            ? event.paths.map((path) => ({
                path,
                existsInRefreshedTree: workspaceContainsPath(refreshed.children, path),
              }))
            : [];
        if (refreshed) {
          registry.update(stateAtom, (state) => ({
            ...state,
            workspaces: state.workspaces.map((ws) => (ws.id === workspaceId ? refreshed : ws)),
          }));
        }
      });

    const startDirectoryWatcher = (workspace: FilesystemWorkspace): Effect.Effect<void> =>
      Effect.gen(function* () {
        enabledDirectoryWatchers.add(workspace.id);
        if (getDirectoryWatcher(workspace.id)) {
          return;
        }

        markDirectoryWatcherPending(workspace.id);
        const debouncedRefresh = debounce((event: WatchEvent) => {
          void Effect.runFork(refreshDirectoryWatcher(workspace.id, event));
        }, WATCHER_DEBOUNCE_MS);

        const unwatch = yield* watchDirectory(workspace.path, (event) =>
          Effect.sync(() => {
            debouncedRefresh(event);
          }),
        );
        if (unwatch) {
          activateDirectoryWatcher(workspace.id, unwatch);
        }
      }).pipe(
        Effect.ensuring(
          Effect.sync(() => {
            if (getDirectoryWatcher(workspace.id)?._tag === 'pending') {
              directoryWatchers.delete(workspace.id);
            }
          }),
        ),
      );

    const stopDirectoryWatcher = (workspaceId: string): Effect.Effect<void> =>
      Effect.sync(() => {
        enabledDirectoryWatchers.delete(workspaceId);
        removeDirectoryWatcher(workspaceId);
      });

    const stopAllDirectoryWatchers = (): Effect.Effect<void> =>
      Effect.gen(function* () {
        const workspaceIds = Array.from(enabledDirectoryWatchers);
        enabledDirectoryWatchers.clear();
        yield* Effect.forEach(workspaceIds, stopDirectoryWatcher, { discard: true });
      });

    // Start directory watchers for restored workspaces.
    const currentWorkspaces = registry.get(stateAtom).workspaces;
    yield* Effect.forEach(currentWorkspaces, startDirectoryWatcher, { discard: true });

    return [
      Capability.contributes(NativeFilesystemCapabilities.State, stateAtom),
      Capability.contributes(NativeFilesystemCapabilities.NativeMarkdownDocuments, nativeMarkdownDocuments),
      Capability.contributes(
        NativeFilesystemCapabilities.DirectoryWatcher,
        {
          startWatching: startDirectoryWatcher,
          stopWatching: stopDirectoryWatcher,
        },
        () => stopAllDirectoryWatchers(),
      ),
    ];
  }),
);
