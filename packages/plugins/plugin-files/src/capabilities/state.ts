//
// Copyright 2025 DXOS.org
//

import { effect } from '@preact/signals-core';
import localforage from 'localforage';

import { Capabilities, contributes, createIntent, type PluginsContext } from '@dxos/app-framework';
import { SubscriptionList } from '@dxos/async';
import { scheduledEffect } from '@dxos/echo-signals/core';
import { LocalStorageStore } from '@dxos/local-storage';
import { AttentionCapabilities } from '@dxos/plugin-attention';

import { FileCapabilities } from './capabilities';
import { FILES_PLUGIN } from '../meta';
import { LocalFilesAction, type FilesSettingsProps, type FilesState } from '../types';
import { findFile, handleToLocalDirectory, handleToLocalFile, PREFIX } from '../util';

export default async (context: PluginsContext) => {
  const state = new LocalStorageStore<FilesState>(FILES_PLUGIN, {
    exportRunning: false,
    files: [],
    current: undefined,
  });

  const { dispatchPromise: dispatch } = context.requestCapability(Capabilities.IntentDispatcher);
  const attention = context.requestCapability(AttentionCapabilities.Attention);
  const settings = context
    .requestCapability(Capabilities.SettingsStore)
    .getStore<FilesSettingsProps>(FILES_PLUGIN)!.value;

  const subscriptions = new SubscriptionList();

  const value = await localforage.getItem<FileSystemHandle[]>(FILES_PLUGIN);
  if (Array.isArray(value) && settings.openLocalFiles) {
    await Promise.all(
      value.map(async (handle) => {
        if (handle.kind === 'file') {
          const file = await handleToLocalFile(handle);
          state.values.files.push(file);
        } else if (handle.kind === 'directory') {
          const directory = await handleToLocalDirectory(handle);
          state.values.files.push(directory);
        }
      }),
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
      void localforage.setItem(FILES_PLUGIN, fileHandles);
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
        const current = (active?.startsWith(PREFIX) && attended && findFile(state.values.files, attended)) || undefined;
        if (state.values.current !== current) {
          state.values.current = current;
        }
      },
    ),
  );

  state.values.rootHandle = (await localforage.getItem(`${FILES_PLUGIN}/rootHandle`)) ?? undefined;

  subscriptions.add(
    effect(() => {
      const rootHandle = state.values.rootHandle;
      if (rootHandle) {
        void localforage.setItem(`${FILES_PLUGIN}/rootHandle`, rootHandle);
      }
    }),
  );

  return contributes(FileCapabilities.State, state.values, () => subscriptions.clear());
};
