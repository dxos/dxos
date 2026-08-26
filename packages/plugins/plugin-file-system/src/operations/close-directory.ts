//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Operation from '@dxos/compute/Operation';

import { FileSystemCapabilities, FileSystemOperation } from '#types';

export default FileSystemOperation.CloseDirectory.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ id }) {
      const registry = yield* Capability.get(Capabilities.AtomRegistry);
      const stateAtom = yield* Capability.get(FileSystemCapabilities.State);
      const fileSystemManager = yield* Capability.get(FileSystemCapabilities.FileSystemManager);

      const workspace = registry.get(stateAtom).workspaces.find((ws) => ws.id === id);

      registry.update(stateAtom, (current) => ({
        ...current,
        workspaces: current.workspaces.filter((ws) => ws.id !== id),
      }));

      if (workspace) {
        yield* fileSystemManager.deactivateWorkspace(workspace);
      }

      yield* fileSystemManager.persistState();
    }),
  ),
);
