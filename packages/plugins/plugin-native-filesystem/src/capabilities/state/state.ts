//
// Copyright 2025 DXOS.org
//

import { Atom } from '@effect-atom/atom-react';
import * as Effect from 'effect/Effect';
import localforage from 'localforage';

import { Capabilities, Capability } from '@dxos/app-framework';
import { log } from '@dxos/log';

import { meta } from '../../meta';
import { NativeFilesystemCapabilities, type NativeFilesystemState, type FilesystemWorkspace } from '../../types';

const STORAGE_KEY = `${meta.id}.workspaces`;

const loadPersistedWorkspaces = async (): Promise<FilesystemWorkspace[]> => {
  try {
    const stored = await localforage.getItem<FilesystemWorkspace[]>(STORAGE_KEY);
    return stored ?? [];
  } catch (error) {
    log.warn('Failed to load persisted workspaces', { error });
    return [];
  }
};

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const registry = yield* Capability.get(Capabilities.AtomRegistry);

    const initialState: NativeFilesystemState = {
      workspaces: [],
      currentFile: undefined,
    };

    const stateAtom = Atom.make<NativeFilesystemState>(initialState).pipe(Atom.keepAlive);

    const persistedWorkspaces = yield* Effect.promise(loadPersistedWorkspaces);
    if (persistedWorkspaces.length > 0) {
      registry.update(stateAtom, (current) => ({
        ...current,
        workspaces: persistedWorkspaces,
      }));
    }

    return Capability.contributes(NativeFilesystemCapabilities.State, stateAtom);
  }),
);
