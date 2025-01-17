//
// Copyright 2025 DXOS.org
//
import React from 'react';

import { Capabilities, contributes, createSurface, useCapability, type PluginsContext } from '@dxos/app-framework';

import { FileCapabilities } from './capabilities';
import { ExportStatus, FilesSettings, LocalFileContainer } from '../components';
import { FILES_PLUGIN, meta } from '../meta';
import { type FilesSettingsProps, type LocalFile } from '../types';
import { isLocalFile } from '../util';

export default (context: PluginsContext) =>
  contributes(Capabilities.ReactSurface, [
    createSurface({
      id: `${FILES_PLUGIN}/article`,
      role: 'article',
      filter: (data): data is { subject: LocalFile } => isLocalFile(data.subject),
      component: ({ data }) => <LocalFileContainer file={data.subject} />,
    }),
    createSurface({
      id: `${FILES_PLUGIN}/settings`,
      role: 'settings',
      filter: (data): data is any => data.subject === meta.id,
      component: () => {
        const settings = useCapability(Capabilities.SettingsStore).getStore<FilesSettingsProps>(FILES_PLUGIN)!.value;
        const state = useCapability(FileCapabilities.State);
        return <FilesSettings settings={settings} state={state} />;
      },
    }),
    createSurface({
      id: `${FILES_PLUGIN}/status`,
      role: 'status',
      filter: (data): data is any => {
        const settings = context
          .requestCapability(Capabilities.SettingsStore)
          .getStore<FilesSettingsProps>(FILES_PLUGIN)!.value;
        return settings.autoExport;
      },
      component: () => {
        const state = useCapability(FileCapabilities.State);
        return <ExportStatus running={state.exportRunning} lastExport={state.lastExport} />;
      },
    }),
  ]);
