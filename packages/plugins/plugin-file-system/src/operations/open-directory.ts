//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Operation from '@dxos/compute/Operation';
import { log } from '@dxos/log';

import { FileSystemCapabilities, FileSystemOperation } from '#types';

import { loadWorkspace, openDirectoryPicker } from '../util';

export default FileSystemOperation.OpenDirectory.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* () {
      const registry = yield* Capability.get(Capabilities.AtomRegistry);
      const stateAtom = yield* Capability.get(FileSystemCapabilities.State);
      const fileSystemManager = yield* Capability.get(FileSystemCapabilities.FileSystemManager);

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

      yield* fileSystemManager.activateWorkspace(workspace);
      yield* fileSystemManager.persistState();

      return { id: workspace.id, subject: [workspace.id] };
    }),
  ),
);
