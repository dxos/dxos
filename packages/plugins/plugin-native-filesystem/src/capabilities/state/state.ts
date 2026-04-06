//
// Copyright 2025 DXOS.org
//

import { Atom } from '@effect-atom/atom-react';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { Capabilities, Capability } from '@dxos/app-framework';
import { log } from '@dxos/log';
import { ClientCapabilities } from '@dxos/plugin-client/types';

import { NativeFilesystemCapabilities, type NativeFilesystemState } from '#types';
import { loadWorkspace, refreshWorkspace } from '../../util';

import { createDirectoryWatcher } from './directory-watcher';
import * as FilesystemManager from './FilesystemManager';
import { createMarkdownDocuments } from './markdown-documents';
import { MirrorSpaceManager } from './mirror-space-manager';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const registry = yield* Capability.get(Capabilities.AtomRegistry);
    const client = yield* Capability.get(ClientCapabilities.Client);

    const stateAtom = Atom.make<NativeFilesystemState>({
      workspaces: [],
      currentFile: undefined,
    }).pipe(Atom.keepAlive);

    const persistedWorkspaces = yield* FilesystemManager.loadPersistedWorkspaces();
    if (persistedWorkspaces.length > 0) {
      const refreshed = yield* Effect.forEach(persistedWorkspaces, (workspace) =>
        loadWorkspace(workspace.path).pipe(Effect.map((latest) => latest ?? workspace)),
      );
      registry.update(stateAtom, (current) => ({
        ...current,
        workspaces: refreshed,
      }));
    }

    const mirrorSpaceManager = new MirrorSpaceManager(client);

    // Defer to the next macrotask so `client.spaces.create()` does not run in the same turn as
    // SpaceList opening persisted spaces (activate -> initializeDataPipelineAsync).
    yield* Effect.promise(() => new Promise<void>((resolve) => setTimeout(resolve, 0)));

    const currentWorkspacesForRestore = registry.get(stateAtom).workspaces;
    yield* Effect.forEach(
      currentWorkspacesForRestore,
      (workspace) =>
        mirrorSpaceManager.getOrCreateSpace(workspace).pipe(
          Effect.asVoid,
          Effect.catchAllCause((cause) => {
            log.warn('Failed to restore mirror space for workspace', { workspaceId: workspace.id, cause });
            return Effect.void;
          }),
        ),
      { discard: true, concurrency: 'unbounded' },
    );

    const markdownDocuments = createMarkdownDocuments(
      registry,
      stateAtom,
      (workspaceId) => mirrorSpaceManager.getSpaceForWorkspace(workspaceId),
      client,
    );

    // Watcher-driven refresh handler: evict, reload, update state, resync.
    const handleDirectoryRefresh = (workspaceId: string): Effect.Effect<void> =>
      Effect.gen(function* () {
        const current = registry.get(stateAtom);
        const currentWorkspace = current.workspaces.find((ws) => ws.id === workspaceId);
        if (!currentWorkspace) {
          return;
        }

        const refreshed = yield* refreshWorkspace(currentWorkspace);
        if (refreshed) {
          markdownDocuments.evictForWorkspace(currentWorkspace);
          registry.update(stateAtom, (state) => ({
            ...state,
            workspaces: state.workspaces.map((ws) => (ws.id === workspaceId ? refreshed : ws)),
          }));
          yield* markdownDocuments.syncFromDisk(refreshed);
        }
      });

    const directoryWatcher = createDirectoryWatcher(handleDirectoryRefresh);

    const filesystemManager = FilesystemManager.make(
      registry,
      stateAtom,
      markdownDocuments,
      directoryWatcher,
      mirrorSpaceManager,
    );

    // Restore markdown documents in a daemon fiber so capability init returns quickly.
    const restoreFromDiskEffect = Effect.forEach(
      currentWorkspacesForRestore,
      (workspace) =>
        Effect.gen(function* () {
          const space = mirrorSpaceManager.getSpaceForWorkspace(workspace.id);
          if (Option.isNone(space)) {
            return;
          }
          yield* markdownDocuments.syncFromDisk(workspace);
        }).pipe(
          Effect.catchAllCause((cause) => {
            log.warn('Failed to restore markdown documents for workspace', { workspaceId: workspace.id, cause });
            return Effect.void;
          }),
        ),
      { discard: true, concurrency: 'unbounded' },
    );

    yield* Effect.forkDaemon(restoreFromDiskEffect);

    // Start directory watchers for restored workspaces.
    const currentWorkspaces = registry.get(stateAtom).workspaces;
    yield* Effect.forEach(currentWorkspaces, directoryWatcher.startWatching, { discard: true });

    return [
      Capability.contributes(NativeFilesystemCapabilities.State, stateAtom),
      Capability.contributes(NativeFilesystemCapabilities.FilesystemManager, filesystemManager, () =>
        directoryWatcher.stopAll(),
      ),
    ];
  }),
);
