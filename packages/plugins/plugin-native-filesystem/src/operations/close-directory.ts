//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import localforage from 'localforage';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/operation';

import { meta } from '../meta';
import { NativeFilesystemCapabilities, NativeFilesystemOperation } from '../types';

export default NativeFilesystemOperation.CloseDirectory.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ id }) {
      const registry = yield* Capability.get(Capabilities.AtomRegistry);
      const stateAtom = yield* Capability.get(NativeFilesystemCapabilities.State);
      const nativeMarkdownDocs = yield* Capability.get(NativeFilesystemCapabilities.NativeMarkdownDocuments);

      const dirWatcher = yield* Capability.get(NativeFilesystemCapabilities.DirectoryWatcher);
      yield* dirWatcher.stopWatching(id);

      const workspace = registry.get(stateAtom).workspaces.find((ws) => ws.id === id);
      if (workspace) {
        nativeMarkdownDocs.evictForWorkspace(workspace);
      }

      registry.update(stateAtom, (current) => ({
        ...current,
        workspaces: current.workspaces.filter((ws) => ws.id !== id),
      }));

      const state = registry.get(stateAtom);
      yield* Effect.promise(() => localforage.setItem(STORAGE_KEY, state.workspaces));
    }),
  ),
);

const STORAGE_KEY = `${meta.id}.workspaces`;
