//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { log } from '@dxos/log';
import { Operation } from '@dxos/operation';

import { NativeFilesystemCapabilities } from '../types';

import { RefreshDirectory } from './definitions';

export default RefreshDirectory.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ id }) {
      const registry = yield* Capability.get(Capabilities.AtomRegistry);
      const stateAtom = yield* Capability.get(NativeFilesystemCapabilities.State);
      const filesystemManager = yield* Capability.get(NativeFilesystemCapabilities.FilesystemManager);

      const state = registry.get(stateAtom);
      const workspace = state.workspaces.find((ws) => ws.id === id);

      if (!workspace) {
        log.warn('Workspace not found for refresh', { id });
        return;
      }

      yield* filesystemManager.refreshWorkspaceContent(workspace);
    }),
  ),
);
