//
// Copyright 2025 DXOS.org
//
import React from 'react';

import { Capabilities, type PluginContext, contributes, createSurface, useCapability } from '@dxos/app-framework';
import { SettingsStore } from '@dxos/local-storage';

import { ExportStatus, FilesSettings, LocalFileContainer } from '../components';
import { FILES_PLUGIN } from '../meta';
import { type FilesSettingsProps, type LocalFile } from '../types';
import { isLocalFile } from '../util';

import { FileCapabilities } from './capabilities';

export default (context: PluginContext) =>
  contributes(Capabilities.ReactSurface, [
    createSurface({
      id: `${FILES_PLUGIN}/article`,
      role: 'article',
      filter: (data): data is { subject: LocalFile } => isLocalFile(data.subject),
      component: ({ data }) => <LocalFileContainer file={data.subject} />,
    }),
    createSurface({
      id: `${FILES_PLUGIN}/plugin-settings`,
      role: 'article',
      filter: (data): data is { subject: SettingsStore<FilesSettingsProps> } =>
        data.subject instanceof SettingsStore && data.subject.prefix === FILES_PLUGIN,
      component: ({ data: { subject } }) => {
        const state = useCapability(FileCapabilities.State);
        return <FilesSettings settings={subject.value} state={state} />;
      },
    }),
    createSurface({
      id: `${FILES_PLUGIN}/status`,
      role: 'status',
      filter: (data): data is any => {
        const settings = context
          .getCapability(Capabilities.SettingsStore)
          .getStore<FilesSettingsProps>(FILES_PLUGIN)!.value;
        return settings.autoExport;
      },
      component: () => {
        const state = useCapability(FileCapabilities.State);
        return <ExportStatus running={state.exportRunning} lastExport={state.lastExport} />;
      },
    }),
  ]);
