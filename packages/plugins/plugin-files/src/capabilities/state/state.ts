//
// Copyright 2025 DXOS.org
//

import { effect } from '@preact/signals-core';
import * as Effect from 'effect/Effect';
import localforage from 'localforage';

import { Capability, Common, createIntent } from '@dxos/app-framework';
import { SubscriptionList } from '@dxos/async';
import { scheduledEffect } from '@dxos/echo-signals/core';
import { LocalStorageStore } from '@dxos/local-storage';
import { AttentionCapabilities } from '@dxos/plugin-attention';

import { meta } from '../../meta';
import { FileCapabilities, type FilesSettingsProps, type FilesState, LocalFilesAction } from '../../types';
import { PREFIX, findFile, handleToLocalDirectory, handleToLocalFile } from '../../util';

export default Capability.makeModule((context: Capability.PluginContext) =>
  Effect.gen(function* () {
    const state = new LocalStorageStore<FilesState>(meta.id, {
      exportRunning: false,
      files: [],
      current: undefined,
    });

    const { dispatchPromise: dispatch } = context.getCapability(Common.Capability.IntentDispatcher);
    const attention = context.getCapability(AttentionCapabilities.Attention);
    const settings = context
      .getCapability(Common.Capability.SettingsStore)
      .getStore<FilesSettingsProps>(meta.id)!.value;

    const subscriptions = new SubscriptionList();

    const value = yield* Effect.tryPromise(() => localforage.getItem<FileSystemHandle[]>(meta.id));
    if (Array.isArray(value) && settings.openLocalFiles) {
      yield* Effect.tryPromise(() =>
        Promise.all(
          value.map(async (handle) => {
            if (handle.kind === 'file') {
              const file = await handleToLocalFile(handle);
              state.values.files.push(file);
            } else if (handle.kind === 'directory') {
              const directory = await handleToLocalDirectory(handle);
              state.values.files.push(directory);
            }
          }),
        ),
      );
    }

    subscriptions.add(
      effect(() => {
        if (!settings.autoExport || !state.values.rootHandle || !dispatch) {
          return;
        }

        const interval = setInterval(async () => {
          if (state.values.exportRunning) {
            return;
          }

          state.values.exportRunning = true;
          await dispatch(createIntent(LocalFilesAction.Export));
          state.values.exportRunning = false;
        }, settings.autoExportInterval);

        return () => clearInterval(interval);
      }),
    );

    subscriptions.add(
      effect(() => {
        if (!settings.openLocalFiles) {
          return;
        }

        const fileHandles = state.values.files.map((file) => file.handle).filter(Boolean);
        void localforage.setItem(meta.id, fileHandles);
      }),
    );

    // Subscribe to attention to track the currently active file.
    subscriptions.add(
      scheduledEffect(
        () => ({
          openLocalFiles: settings.openLocalFiles,
          attended: attention.current,
        }),
        ({ openLocalFiles, attended }) => {
          if (!openLocalFiles) {
            return;
          }

          const active = attended?.[0];
          const current =
            (active?.startsWith(PREFIX) && attended && findFile(state.values.files, attended)) || undefined;
          if (state.values.current !== current) {
            state.values.current = current;
          }
        },
      ),
    );

    state.values.rootHandle =
      (yield* Effect.tryPromise(() => localforage.getItem<FileSystemDirectoryHandle>(`${meta.id}/rootHandle`))) ??
      undefined;

    subscriptions.add(
      effect(() => {
        const rootHandle = state.values.rootHandle;
        if (rootHandle) {
          void localforage.setItem(`${meta.id}/rootHandle`, rootHandle);
        }
      }),
    );

    return Capability.contributes(FileCapabilities.State, state.values, () => Effect.sync(() => subscriptions.clear()));
  }),
);
