//
// Copyright 2025 DXOS.org
//

import type { WatchEvent } from '@tauri-apps/plugin-fs';

import { Atom, type Registry } from '@effect-atom/atom-react';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import localforage from 'localforage';

import { Capabilities, Capability } from '@dxos/app-framework';
import { debounce } from '@dxos/async';
import { type Client } from '@dxos/client';
import { type Space } from '@dxos/client/echo';
import { DXN, Obj } from '@dxos/echo';
import { updateText } from '@dxos/echo-db';
import { log } from '@dxos/log';
import { ClientCapabilities } from '@dxos/plugin-client';
import { Text } from '@dxos/schema';

import { meta } from '../../meta';
import {
  NativeFilesystemCapabilities,
  type MirrorSpaceManagerService,
  type NativeMarkdownDocumentsService,
  type NativeFilesystemState,
  type FilesystemFile,
  type FilesystemWorkspace,
  type FilesystemEntry,
  isFilesystemFile,
} from '../../types';
import {
  findFileById,
  getFileXattrDxn,
  loadWorkspace,
  readComposerConfig,
  readFileContent,
  readFileMap,
  refreshWorkspace,
  setFileXattrDxn,
  updateFileInWorkspace,
  watchDirectory,
  watchMarkdownFile,
  writeComposerConfig,
  writeFileMap,
  type FileMapEntry,
} from '../../util';

const WATCHER_DEBOUNCE_MS = 500;
/** Yield to the event loop every N files during restore so capability init cannot wedge the UI thread. */
const RESTORE_YIELD_EVERY_N_FILES = 25;
const STORAGE_KEY = `${meta.id}.workspaces`;
const FILESYSTEM_MIRROR_TAG = 'org.dxos.space.filesystem-mirror';

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

/** Collect all markdown files from a tree of entries. */
const collectMarkdownFiles = (entries: FilesystemEntry[]): FilesystemFile[] => {
  const files: FilesystemFile[] = [];
  for (const entry of entries) {
    if ('children' in entry) {
      files.push(...collectMarkdownFiles(entry.children));
    } else if (isFilesystemFile(entry) && entry.type === 'markdown') {
      files.push(entry);
    }
  }
  return files;
};

/** Compute a relative path from a workspace root. */
const relativePath = (workspacePath: string, filePath: string): string => {
  const prefix = workspacePath.endsWith('/') ? workspacePath : workspacePath + '/';
  return filePath.startsWith(prefix) ? filePath.slice(prefix.length) : filePath;
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

/**
 * Resolve a Text object from a stored DXN by looking up its owning space on the client.
 * Uses sync resolution first (`getObjectById`, `makeRef` sync target); falls back to
 * `ref.tryLoad()` because objects in linked documents may not be hydrated until async load.
 */
const resolveTextObjectFromStoredDxnAsync = async (
  client: Client,
  dxnStr: string,
): Promise<Text.Text | undefined> => {
  const parsed = DXN.tryParse(dxnStr);
  if (!parsed) {
    return undefined;
  }
  const echoDxn = parsed.asEchoDXN();
  if (!echoDxn) {
    return undefined;
  }
  const owningSpace = echoDxn.spaceId ? client.spaces.get(echoDxn.spaceId) : undefined;
  if (!owningSpace) {
    return undefined;
  }

  const byId = owningSpace.db.getObjectById(echoDxn.echoId);
  if (byId && Obj.instanceOf(Text.Text, byId)) {
    return byId;
  }

  const ref = owningSpace.db.makeRef(parsed);
  const syncTarget = ref.target as Text.Text | undefined;
  if (syncTarget && Obj.instanceOf(Text.Text, syncTarget)) {
    return syncTarget;
  }

  const loaded = await ref.tryLoad();
  if (loaded && Obj.instanceOf(Text.Text, loaded)) {
    return loaded;
  }
  return undefined;
};

const createNativeMarkdownDocumentsService = (
  registry: Registry.Registry,
  stateAtom: Atom.Writable<NativeFilesystemState>,
  getSpaceForWorkspace: (workspaceId: string) => Option.Option<Space>,
  client: Client,
): NativeMarkdownDocumentsService => {
  const documentsByFileId = new Map<string, Text.Text>();
  const writeTargetByDxn = new Map<string, { path: string; fileId: string }>();
  const dxnByFileId = new Map<string, string>();
  const unwatchByFileId = new Map<string, () => void>();
  const watchStartPending = new Set<string>();
  const serviceRef: { current?: NativeMarkdownDocumentsService } = {};

  const markdownBindingGeneration = Atom.family((fileId: string) =>
    Atom.make(0).pipe(Atom.keepAlive),
  );

  const bumpMarkdownBinding = (fileId: string): void => {
    registry.update(markdownBindingGeneration(fileId), (generation) => generation + 1);
  };

  /** Update indexes without bumping per-file graph atom (used when rebinding an already-indexed file). */
  const updateMapsForDocument = (fileId: string, path: string, doc: Text.Text): void => {
    const dxn = Obj.getDXN(doc).toString();
    documentsByFileId.set(fileId, doc);
    writeTargetByDxn.set(dxn, { path, fileId });
    dxnByFileId.set(fileId, dxn);
  };

  /** First-time bind of a file to a Text object; bumps that file's atom so graph connectors refresh. */
  const indexDocument = (fileId: string, path: string, doc: Text.Text): void => {
    updateMapsForDocument(fileId, path, doc);
    bumpMarkdownBinding(fileId);
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

      // Sync file name from the current filesystem state.
      const state = registry.get(stateAtom);
      const fileResult = findFileById(state.workspaces, fileId);
      if (fileResult && doc.name !== fileResult.file.name) {
        Obj.change(doc, (mutable) => {
          mutable.name = fileResult.file.name;
        });
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

  /** Persist xattr + filemap entry for a newly created document (fire-and-forget). */
  const persistFileIdentity = (file: FilesystemFile, workspaceId: string, dxn: string): void => {
    const state = registry.get(stateAtom);
    const workspace = state.workspaces.find((ws) => ws.id === workspaceId);
    if (!workspace) {
      return;
    }

    void Effect.runFork(
      Effect.gen(function* () {
        // Write xattr to the file.
        yield* setFileXattrDxn(file.path, dxn);

        // Update filemap.json.
        const relPath = relativePath(workspace.path, file.path);
        const fileMap = yield* readFileMap(workspace.path);
        const existingIdx = fileMap.files.findIndex((entry) => entry.relativePath === relPath);
        const newEntry: FileMapEntry = { relativePath: relPath, objectDxn: dxn };
        if (existingIdx >= 0) {
          fileMap.files[existingIdx] = newEntry;
        } else {
          fileMap.files.push(newEntry);
        }
        yield* writeFileMap(workspace.path, fileMap);
      }),
    );
  };

  const service: NativeMarkdownDocumentsService = {
    markdownBindingAtom: (fileId: string) => markdownBindingGeneration(fileId),

    ensureDocumentForFile: (file: FilesystemFile, workspaceId: string): Text.Text => {
      const existing = documentsByFileId.get(file.id);
      if (existing) {
        if (existing.name !== file.name) {
          Obj.change(existing, (doc) => {
            doc.name = file.name;
          });
        }
        updateMapsForDocument(file.id, file.path, existing);
        ensureFileWatcher(file);
        return existing;
      }

      const space = getSpaceForWorkspace(workspaceId);
      if (Option.isNone(space)) {
        throw new Error(`Mirror space not available for workspace ${workspaceId}`);
      }
      const doc = space.value.db.add(Obj.make(Text.Text, { content: file.text ?? '', name: file.name }));
      indexDocument(file.id, file.path, doc);
      ensureFileWatcher(file);

      // Persist the identity mapping (xattr + filemap) for new objects.
      const dxn = Obj.getDXN(doc).toString();
      persistFileIdentity(file, workspaceId, dxn);

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

    restoreWorkspaceDocuments: (workspace: FilesystemWorkspace, space: Space): Effect.Effect<void> =>
      Effect.gen(function* () {
        const files = collectMarkdownFiles(workspace.children);
        if (files.length === 0) {
          return;
        }

        // Load filemap for path-based fallback.
        const fileMap = yield* readFileMap(workspace.path);
        const fileMapByPath = new Map(fileMap.files.map((entry) => [entry.relativePath, entry.objectDxn]));
        let fileMapDirty = false;

        let fileIndex = 0;
        for (const file of files) {
          fileIndex++;
          if (fileIndex % RESTORE_YIELD_EVERY_N_FILES === 0) {
            yield* Effect.promise(() => new Promise<void>((resolve) => setTimeout(resolve, 0)));
          }

          if (documentsByFileId.has(file.id)) {
            continue;
          }

          // Try xattr first (survives renames).
          let dxnStr = yield* getFileXattrDxn(file.path);

          // Fallback: try filemap by relative path.
          if (!dxnStr) {
            const relPath = relativePath(workspace.path, file.path);
            dxnStr = fileMapByPath.get(relPath);
          }

          if (!dxnStr) {
            continue;
          }

          const parsedDxn = DXN.tryParse(dxnStr);
          if (!parsedDxn) {
            continue;
          }

          let target: Text.Text | undefined;
          try {
            target = yield* Effect.promise(() => resolveTextObjectFromStoredDxnAsync(client, dxnStr));
          } catch (error) {
            log.warn('Ref resolution threw during restore', { fileId: file.id, path: file.path, dxn: dxnStr, error });
            continue;
          }

          if (!target || !Obj.instanceOf(Text.Text, target)) {
            log.warn('Failed to restore object for file', { fileId: file.id, path: file.path, dxn: dxnStr, found: !!target });
            continue;
          }

          // Successfully restored — index it.
          indexDocument(file.id, file.path, target);

          // Sync file name from filesystem.
          if (target.name !== file.name) {
            Obj.change(target, (mutable) => {
              mutable.name = file.name;
            });
          }

          // Reconcile: if disk content differs from persisted Text object, update the Text object.
          const diskText = file.text ?? (yield* readFileContent(file.path)) ?? '';
          const persistedText = target.content ?? '';
          if (diskText !== persistedText) {
            updateText(target, ['content'], diskText);
          }

          // Ensure xattr is set (may have been restored from filemap fallback).
          yield* setFileXattrDxn(file.path, dxnStr);

          // Update filemap entry to match current path.
          const relPath = relativePath(workspace.path, file.path);
          const existingMapDxn = fileMapByPath.get(relPath);
          if (existingMapDxn !== dxnStr) {
            fileMapByPath.set(relPath, dxnStr);
            fileMapDirty = true;
          }
        }

        // Persist updated filemap if changed.
        if (fileMapDirty) {
          const updatedFileMap = { files: Array.from(fileMapByPath.entries()).map(([rp, dxn]) => ({ relativePath: rp, objectDxn: dxn })) };
          yield* writeFileMap(workspace.path, updatedFileMap);
        }
      }),

    syncMarkdownFilesFromDisk: (workspace: FilesystemWorkspace): Effect.Effect<void> =>
      Effect.gen(function* () {
        const space = getSpaceForWorkspace(workspace.id);
        if (Option.isNone(space)) {
          return;
        }
        yield* Effect.promise(() => space.value.waitUntilReady());
        const svc = serviceRef.current;
        if (!svc) {
          return;
        }
        yield* svc.restoreWorkspaceDocuments(workspace, space.value).pipe(
          Effect.catchAll((error) =>
            Effect.sync(() => {
              log.error('restoreWorkspaceDocuments failed', { workspaceId: workspace.id, error });
            }),
          ),
        );
        for (const file of collectMarkdownFiles(workspace.children)) {
          if (svc.getByFileId(file.id)) {
            continue;
          }
          try {
            svc.ensureDocumentForFile(file, workspace.id);
          } catch {
            // Mirror space missing.
          }
        }
      }),

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
        bumpMarkdownBinding(fileId);
      }
    },
  };
  serviceRef.current = service;
  return service;
};

const createMirrorSpaceManagerService = (
  client: { spaces: { get(): Space[]; create(props?: any, options?: { tags?: string[] }): Promise<Space> } },
): MirrorSpaceManagerService => {
  const spaceByWorkspaceId = new Map<string, Space>();

  const getOrCreateSpace = (workspace: FilesystemWorkspace): Effect.Effect<Space> =>
    Effect.gen(function* () {
      const cached = spaceByWorkspaceId.get(workspace.id);
      if (cached) {
        return cached;
      }

      // Check .composer/meta.json for a persisted space ID.
      const config = yield* readComposerConfig(workspace.path);
      if (config.spaceId) {
        const existing = client.spaces.get().find((space) => space.id === config.spaceId);
        if (existing) {
          spaceByWorkspaceId.set(workspace.id, existing);
          return existing;
        }

        // Stale spaceId — space no longer exists. Clear it from config.
        log.warn('Mirror space not found, creating new one', { workspaceId: workspace.id, staleSpaceId: config.spaceId });
        yield* writeComposerConfig(workspace.path, { ...config, spaceId: undefined });
      }

      // Create a new mirror space.
      // TODO(wittjosiah): Lock mirror spaces on creation once space locking lands.
      const space = yield* Effect.promise(() =>
        client.spaces.create({}, { tags: [FILESYSTEM_MIRROR_TAG] }),
      );
      yield* Effect.promise(() => space.waitUntilReady());

      // Persist the space ID to .composer/meta.json.
      const currentConfig = yield* readComposerConfig(workspace.path);
      yield* writeComposerConfig(workspace.path, { ...currentConfig, spaceId: space.id });

      spaceByWorkspaceId.set(workspace.id, space);
      return space;
    });

  const getSpaceForWorkspace = (workspaceId: string): Option.Option<Space> => {
    const space = spaceByWorkspaceId.get(workspaceId);
    return space ? Option.some(space) : Option.none();
  };

  return { getOrCreateSpace, getSpaceForWorkspace };
};

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const registry = yield* Capability.get(Capabilities.AtomRegistry);
    const client = yield* Capability.get(ClientCapabilities.Client);

    const initialState: NativeFilesystemState = {
      workspaces: [],
      currentFile: undefined,
      markdownRestoreCompleteByWorkspaceId: {},
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

    const mirrorSpaceManager = createMirrorSpaceManagerService(client);

    // Ensure a mirror space exists for every persisted workspace before any graph Text nodes load.
    // getOrCreateSpace reads .composer/meta.json when present; otherwise creates a space and persists it.
    //
    // Defer to the next macrotask so `client.spaces.create()` does not run in the same turn as
    // SpaceList opening persisted spaces (activate → initializeDataPipelineAsync). Interleaving those
    // caused "Error initializing data pipeline" on DataSpace#0/#1 during startup.
    yield* Effect.promise(() => new Promise<void>((resolve) => setTimeout(resolve, 0)));

    const currentWorkspacesForRestore = registry.get(stateAtom).workspaces;
    yield* Effect.forEach(
      currentWorkspacesForRestore,
      (workspace) => mirrorSpaceManager.getOrCreateSpace(workspace).pipe(Effect.asVoid),
      { discard: true, concurrency: 'unbounded' },
    );

    const nativeMarkdownDocuments = createNativeMarkdownDocumentsService(
      registry,
      stateAtom,
      mirrorSpaceManager.getSpaceForWorkspace,
      client,
    );

    // Restore xattr/filemap → Text mappings in a daemon fiber so capability init returns without
    // waiting for every file (large vaults). Use forkDaemon (not fork) so restore is not tied to the
    // module activation scope and is not interrupted when that effect finishes.
    // Graph nodes use getByFileId only; unmapped files get ensureDocumentForFile here (not from graph).
    const markRestoreComplete = (workspaceId: string): void => {
      registry.update(stateAtom, (current) => ({
        ...current,
        markdownRestoreCompleteByWorkspaceId: {
          ...current.markdownRestoreCompleteByWorkspaceId,
          [workspaceId]: true,
        },
      }));
    };

    const restoreFromDiskEffect = Effect.forEach(
      currentWorkspacesForRestore,
      (workspace) =>
        Effect.gen(function* () {
          const space = mirrorSpaceManager.getSpaceForWorkspace(workspace.id);
          if (Option.isNone(space)) {
            markRestoreComplete(workspace.id);
            return;
          }
          yield* nativeMarkdownDocuments.syncMarkdownFilesFromDisk(workspace);
          markRestoreComplete(workspace.id);
        }),
      { discard: true, concurrency: 'unbounded' },
    );

    yield* Effect.forkDaemon(restoreFromDiskEffect);

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

    const refreshDirectoryWatcher = (workspaceId: string, _event: WatchEvent): Effect.Effect<void> =>
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
        const refreshed = yield* refreshWorkspace(currentWorkspace);
        if (refreshed) {
          nativeMarkdownDocuments.evictForWorkspace(currentWorkspace);
          registry.update(stateAtom, (state) => ({
            ...state,
            workspaces: state.workspaces.map((ws) => (ws.id === workspaceId ? refreshed : ws)),
          }));
          yield* nativeMarkdownDocuments.syncMarkdownFilesFromDisk(refreshed);
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
      Capability.contributes(NativeFilesystemCapabilities.MirrorSpaceManager, mirrorSpaceManager),
    ];
  }),
);
