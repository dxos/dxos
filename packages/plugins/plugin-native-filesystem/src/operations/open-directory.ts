//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import localforage from 'localforage';

import { Capabilities, Capability } from '@dxos/app-framework';
import { log } from '@dxos/log';
import { Operation } from '@dxos/operation';

import { meta } from '../meta';
import { NativeFilesystemCapabilities, NativeFilesystemOperation } from '../types';
import { loadWorkspace, openDirectoryPicker } from '../util';

export default NativeFilesystemOperation.OpenDirectory.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* () {
      const registry = yield* Capability.get(Capabilities.AtomRegistry);
      const stateAtom = yield* Capability.get(NativeFilesystemCapabilities.State);

      const path = yield* openDirectoryPicker();
      if (!path) {
        return undefined;
      }

      const workspace = yield* loadWorkspace(path);
      if (!workspace) {
        log.warn('Failed to load workspace', { path });
        return undefined;
      }

      registry.update(stateAtom, (current) => {
        const existingIndex = current.workspaces.findIndex((ws) => ws.path === path);
        if (existingIndex >= 0) {
          const updated = [...current.workspaces];
          updated[existingIndex] = workspace;
          return { ...current, workspaces: updated };
        }
        return { ...current, workspaces: [...current.workspaces, workspace] };
      });

      const state = registry.get(stateAtom);
      yield* Effect.promise(() => localforage.setItem(STORAGE_KEY, state.workspaces));

      const dirWatcher = yield* Capability.get(NativeFilesystemCapabilities.DirectoryWatcher);
      yield* dirWatcher.startWatching(workspace);

      return { id: workspace.id, subject: [workspace.id] };
    }),
  ),
);

const STORAGE_KEY = `${meta.id}.workspaces`;
