//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { log } from '@dxos/log';
import { Operation } from '@dxos/operation';

import { NativeFilesystemCapabilities, NativeFilesystemOperation, type FilesystemWorkspace } from '../types';
import { refreshWorkspace } from '../util';

export default NativeFilesystemOperation.RefreshDirectory.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ id }) {
      const registry = yield* Capability.get(Capabilities.AtomRegistry);
      const stateAtom = yield* Capability.get(NativeFilesystemCapabilities.State);
      const nativeMarkdownDocs = yield* Capability.get(NativeFilesystemCapabilities.NativeMarkdownDocuments);

      const state = registry.get(stateAtom);
      const workspace = state.workspaces.find((ws) => ws.id === id);

      if (!workspace) {
        log.warn('Workspace not found for refresh', { id });
        return;
      }

      nativeMarkdownDocs.evictForWorkspace(workspace);

      const refreshed = yield* Effect.promise(() => refreshWorkspace(workspace));
      if (refreshed) {
        registry.update(stateAtom, (current) => ({
          ...current,
          workspaces: current.workspaces.map((ws: FilesystemWorkspace) => (ws.id === id ? refreshed : ws)),
        }));
      }
    }),
  ),
);
