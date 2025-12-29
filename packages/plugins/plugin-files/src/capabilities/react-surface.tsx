//
// Copyright 2025 DXOS.org
//
import React from 'react';

import { Capability, Common } from '@dxos/app-framework';
import { useCapability } from '@dxos/app-framework/react';
import { SettingsStore } from '@dxos/local-storage';

import { ExportStatus, FilesSettings, LocalFileContainer } from '../components';
import { meta } from '../meta';
import { type FilesSettingsProps, type LocalFile } from '../types';
import { isLocalFile } from '../util';

import { FileCapabilities } from './capabilities';

export default Capability.makeModule((context) =>
  Capability.contributes(Common.Capability.ReactSurface, [
    Common.createSurface({
      id: `${meta.id}/article`,
      role: 'article',
      filter: (data): data is { subject: LocalFile } => isLocalFile(data.subject),
      component: ({ data }) => <LocalFileContainer file={data.subject} />,
    }),
    Common.createSurface({
      id: `${meta.id}/plugin-settings`,
      role: 'article',
      filter: (data): data is { subject: SettingsStore<FilesSettingsProps> } =>
        data.subject instanceof SettingsStore && data.subject.prefix === meta.id,
      component: ({ data: { subject } }) => {
        const state = useCapability(FileCapabilities.State);
        return <FilesSettings settings={subject.value} state={state} />;
      },
    }),
    Common.createSurface({
      id: `${meta.id}/status`,
      role: 'status',
      filter: (data): data is any => {
        const settings = context
          .getCapability(Common.Capability.SettingsStore)
          .getStore<FilesSettingsProps>(meta.id)!.value;
        return settings.autoExport;
      },
      component: () => {
        const state = useCapability(FileCapabilities.State);
        return <ExportStatus running={state.exportRunning} lastExport={state.lastExport} />;
      },
    }),
  ]),
);
