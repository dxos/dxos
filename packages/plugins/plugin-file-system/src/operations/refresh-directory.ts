//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Operation from '@dxos/compute/Operation';
import { log } from '@dxos/log';

import { FileSystemCapabilities, FileSystemOperation } from '#types';

export default FileSystemOperation.RefreshDirectory.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ id }) {
      const registry = yield* Capability.get(Capabilities.AtomRegistry);
      const stateAtom = yield* Capability.get(FileSystemCapabilities.State);
      const fileSystemManager = yield* Capability.get(FileSystemCapabilities.FileSystemManager);

      const state = registry.get(stateAtom);
      const workspace = state.workspaces.find((ws) => ws.id === id);

      if (!workspace) {
        log.warn('Workspace not found for refresh', { id });
        return;
      }

      yield* fileSystemManager.refreshWorkspaceContent(workspace);
    }),
  ),
);
