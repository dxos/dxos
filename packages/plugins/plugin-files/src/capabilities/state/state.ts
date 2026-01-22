//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import localforage from 'localforage';

import { Capability, Common } from '@dxos/app-framework';
import { SubscriptionList } from '@dxos/async';
import { scheduledEffect } from '@dxos/echo-signals/core';
import { LocalStorageStore } from '@dxos/local-storage';
import { AttentionCapabilities } from '@dxos/plugin-attention';

import { meta } from '../../meta';
import { FileCapabilities, type FilesSettingsProps, type FilesState, LocalFilesOperation } from '../../types';
import { PREFIX, findFile, handleToLocalDirectory, handleToLocalFile } from '../../util';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const store = new LocalStorageStore<FilesState>(meta.id, {
      exportRunning: false,
      files: [],
      current: undefined,
    });

    const registry = yield* Capability.get(Common.Capability.AtomRegistry);
    const { invokePromise } = yield* Capability.get(Common.Capability.OperationInvoker);
    const attention = yield* Capability.get(AttentionCapabilities.Attention);
    const settingsAtom = yield* Capability.get(FileCapabilities.Settings);
    const getSettings = () => registry.get(settingsAtom);

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
      store.update((current) => ({ ...current, files: [...current.files, ...files] }));
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
        if (!autoExport || !store.values.rootHandle || !invokePromise) {
          return;
        }

        autoExportInterval = setInterval(async () => {
          if (store.values.exportRunning) {
            return;
          }

          store.update((current) => ({ ...current, exportRunning: true }));
          await invokePromise(LocalFilesOperation.Export);
          store.update((current) => ({ ...current, exportRunning: false }));
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
      registry.subscribe(store.atom, () => {
        if (!getSettings().openLocalFiles) {
          return;
        }

        const fileHandles = store.values.files.map((file) => file.handle).filter(Boolean);
        void localforage.setItem(meta.id, fileHandles);
      }),
    );

    // Subscribe to attention to track the currently active file.
    subscriptions.add(
      scheduledEffect(
        () => ({
          openLocalFiles: getSettings().openLocalFiles,
          attended: attention.current,
        }),
        ({ openLocalFiles, attended }) => {
          if (!openLocalFiles) {
            return;
          }

          const active = attended?.[0];
          const current =
            (active?.startsWith(PREFIX) && attended && findFile(store.values.files, attended)) || undefined;
          if (store.values.current !== current) {
            store.update((s) => ({ ...s, current }));
          }
        },
      ),
    );

    const savedRootHandle = yield* Effect.tryPromise(() =>
      localforage.getItem<FileSystemDirectoryHandle>(`${meta.id}/rootHandle`),
    );
    if (savedRootHandle) {
      store.update((current) => ({ ...current, rootHandle: savedRootHandle }));
    }

    // Persist root handle.
    subscriptions.add(
      registry.subscribe(store.atom, () => {
        const rootHandle = store.values.rootHandle;
        if (rootHandle) {
          void localforage.setItem(`${meta.id}/rootHandle`, rootHandle);
        }
      }),
    );

    return Capability.contributes(FileCapabilities.State, store, () =>
      Effect.sync(() => {
        subscriptions.clear();
        store.close();
      }),
    );
  }),
);
