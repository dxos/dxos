//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/operation';

import { NativeFilesystemCapabilities } from '../types';
import { CloseDirectory } from './definitions';

export default CloseDirectory.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ id }) {
      const registry = yield* Capability.get(Capabilities.AtomRegistry);
      const stateAtom = yield* Capability.get(NativeFilesystemCapabilities.State);
      const filesystemManager = yield* Capability.get(NativeFilesystemCapabilities.FilesystemManager);

      const workspace = registry.get(stateAtom).workspaces.find((ws) => ws.id === id);

      registry.update(stateAtom, (current) => ({
        ...current,
        workspaces: current.workspaces.filter((ws) => ws.id !== id),
      }));

      if (workspace) {
        yield* filesystemManager.deactivateWorkspace(workspace);
      }

      yield* filesystemManager.persistState();
    }),
  ),
);
