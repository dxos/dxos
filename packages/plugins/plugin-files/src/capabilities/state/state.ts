//
// Copyright 2025 DXOS.org
//

import { Atom } from '@effect-atom/atom-react';
import * as Effect from 'effect/Effect';
import localforage from 'localforage';

import { Capabilities, Capability } from '@dxos/app-framework';
import { SubscriptionList } from '@dxos/async';
import { AttentionCapabilities } from '@dxos/plugin-attention';

import { meta } from '../../meta';
import { FileCapabilities, type FilesState, LocalFilesOperation } from '../../types';
import { PREFIX, findFile, handleToLocalDirectory, handleToLocalFile } from '../../util';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    // State atom for files plugin (not persisted to localStorage, uses localforage for handles).
    const stateAtom = Atom.make<FilesState>({
      exportRunning: false,
      files: [],
      current: undefined,
    }).pipe(Atom.keepAlive);

    const registry = yield* Capability.get(Capabilities.AtomRegistry);
    const { invokePromise } = yield* Capability.get(Capabilities.OperationInvoker);
    const attention = yield* Capability.get(AttentionCapabilities.Attention);
    const settingsAtom = yield* Capability.get(FileCapabilities.Settings);
    const getSettings = () => registry.get(settingsAtom);
    const getState = () => registry.get(stateAtom);

    const subscriptions = new SubscriptionList();

    const value = yield* Effect.tryPromise(() => localforage.getItem<FileSystemHandle[]>(meta.id));
    if (Array.isArray(value) && getSettings().openLocalFiles) {
      const files: FilesState['files'] = [];
      yield* Effect.tryPromise(() =>
        Promise.all(
          value.map(async (handle) => {
            if (handle.kind === 'file') {
              const file = await handleToLocalFile(handle);
              files.push(file);
            } else if (handle.kind === 'directory') {
              const directory = await handleToLocalDirectory(handle);
              files.push(directory);
            }
          }),
        ),
      );
      registry.update(stateAtom, (current) => ({ ...current, files: [...current.files, ...files] }));
    }

    // Auto-export subscription.
    let autoExportInterval: ReturnType<typeof setInterval> | undefined;
    subscriptions.add(
      registry.subscribe(settingsAtom, () => {
        if (autoExportInterval) {
          clearInterval(autoExportInterval);
          autoExportInterval = undefined;
        }

        const { autoExport, autoExportInterval: interval } = getSettings();
        if (!autoExport || !getState().rootHandle || !invokePromise) {
          return;
        }

        autoExportInterval = setInterval(async () => {
          if (getState().exportRunning) {
            return;
          }

          registry.update(stateAtom, (current) => ({ ...current, exportRunning: true }));
          await invokePromise(LocalFilesOperation.Export);
          registry.update(stateAtom, (current) => ({ ...current, exportRunning: false }));
        }, interval);
      }),
    );
    subscriptions.add(() => {
      if (autoExportInterval) {
        clearInterval(autoExportInterval);
      }
    });

    // Persist file handles.
    subscriptions.add(
      registry.subscribe(stateAtom, () => {
        if (!getSettings().openLocalFiles) {
          return;
        }

        const fileHandles = getState()
          .files.map((file) => file.handle)
          .filter(Boolean);
        void localforage.setItem(meta.id, fileHandles);
      }),
    );

    // Subscribe to attention to track the currently active file.
    const updateCurrentFile = () => {
      if (!getSettings().openLocalFiles) {
        return;
      }

      const attended = attention.getCurrent();
      const active = attended?.[0];
      const current = (active?.startsWith(PREFIX) && attended && findFile(getState().files, attended)) || undefined;
      if (getState().current !== current) {
        registry.update(stateAtom, (s) => ({ ...s, current }));
      }
    };
    updateCurrentFile();
    subscriptions.add(registry.subscribe(settingsAtom, updateCurrentFile));
    subscriptions.add(attention.subscribeCurrent(updateCurrentFile));

    const savedRootHandle = yield* Effect.tryPromise(() =>
      localforage.getItem<FileSystemDirectoryHandle>(`${meta.id}/rootHandle`),
    );
    if (savedRootHandle) {
      registry.update(stateAtom, (current) => ({ ...current, rootHandle: savedRootHandle }));
    }

    // Persist root handle.
    subscriptions.add(
      registry.subscribe(stateAtom, () => {
        const rootHandle = getState().rootHandle;
        if (rootHandle) {
          void localforage.setItem(`${meta.id}/rootHandle`, rootHandle);
        }
      }),
    );

    return Capability.contributes(FileCapabilities.State, stateAtom, () =>
      Effect.sync(() => {
        subscriptions.clear();
      }),
    );
  }),
);
