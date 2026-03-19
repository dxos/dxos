//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import localforage from 'localforage';

import { Capabilities, Capability } from '@dxos/app-framework';
import { log } from '@dxos/log';
import { OperationResolver } from '@dxos/operation';

import { meta } from '../../meta';
import {
  NativeFilesystemCapabilities,
  NativeFilesystemOperation,
  type NativeFilesystemState,
  type FilesystemWorkspace,
} from '../../types';
import {
  findFileById,
  loadWorkspace,
  openDirectoryPicker,
  refreshWorkspace,
  updateFileInWorkspace,
  writeFileContent,
} from '../../util';

const STORAGE_KEY = `${meta.id}.workspaces`;

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const registry = yield* Capability.get(Capabilities.AtomRegistry);
    const stateAtom = yield* Capability.get(NativeFilesystemCapabilities.State);
    const getState = (): NativeFilesystemState => registry.get(stateAtom);
    const updateState = (fn: (current: NativeFilesystemState) => NativeFilesystemState): void => {
      registry.update(stateAtom, fn);
    };

    return Capability.contributes(Capabilities.OperationResolver, [
      OperationResolver.make({
        operation: NativeFilesystemOperation.OpenDirectory,
        handler: Effect.fnUntraced(function* () {
          const path = yield* Effect.promise(openDirectoryPicker);
          if (!path) {
            return undefined;
          }

          const workspace = yield* Effect.promise(() => loadWorkspace(path));
          if (!workspace) {
            log.warn('Failed to load workspace', { path });
            return undefined;
          }

          updateState((current) => {
            const existingIndex = current.workspaces.findIndex((ws) => ws.path === path);
            if (existingIndex >= 0) {
              const updated = [...current.workspaces];
              updated[existingIndex] = workspace;
              return { ...current, workspaces: updated };
            }
            return { ...current, workspaces: [...current.workspaces, workspace] };
          });

          const state = getState();
          yield* Effect.promise(() => localforage.setItem(STORAGE_KEY, state.workspaces));

          return { id: workspace.id, subject: [workspace.id] };
        }),
      }),

      OperationResolver.make({
        operation: NativeFilesystemOperation.CloseDirectory,
        handler: Effect.fnUntraced(function* ({ id }) {
          updateState((current) => ({
            ...current,
            workspaces: current.workspaces.filter((ws) => ws.id !== id),
          }));

          const state = getState();
          yield* Effect.promise(() => localforage.setItem(STORAGE_KEY, state.workspaces));
        }),
      }),

      OperationResolver.make({
        operation: NativeFilesystemOperation.SaveFile,
        handler: Effect.fnUntraced(function* ({ id }) {
          const state = getState();
          const result = findFileById(state.workspaces, id);

          if (!result) {
            log.warn('File not found for save', { id });
            return;
          }

          const { workspace, file } = result;

          if (file.text === undefined) {
            log.warn('File has no content to save', { id });
            return;
          }

          const success = yield* Effect.promise(() => writeFileContent(file.path, file.text!));
          if (success) {
            updateState((current) => ({
              ...current,
              workspaces: current.workspaces.map((ws: FilesystemWorkspace) =>
                ws.id === workspace.id ? updateFileInWorkspace(ws, id, { modified: false }) : ws,
              ),
            }));
          }
        }),
      }),

      OperationResolver.make({
        operation: NativeFilesystemOperation.RefreshDirectory,
        handler: Effect.fnUntraced(function* ({ id }) {
          const state = getState();
          const workspace = state.workspaces.find((ws) => ws.id === id);

          if (!workspace) {
            log.warn('Workspace not found for refresh', { id });
            return;
          }

          const refreshed = yield* Effect.promise(() => refreshWorkspace(workspace));
          if (refreshed) {
            updateState((current) => ({
              ...current,
              workspaces: current.workspaces.map((ws: FilesystemWorkspace) => (ws.id === id ? refreshed : ws)),
            }));
          }
        }),
      }),
    ]);
  }),
);
