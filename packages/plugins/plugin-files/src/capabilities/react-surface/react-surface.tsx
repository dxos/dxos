//
// Copyright 2025 DXOS.org
//
import * as Effect from 'effect/Effect';
import React from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface, useAtomCapability, useSettingsState } from '@dxos/app-framework/ui';
import { AppCapabilities } from '@dxos/app-toolkit';

import { ExportStatus, FilesSettings, LocalFileContainer } from '../../components';
import { meta } from '../../meta';
import { FileCapabilities, type FilesSettingsProps, type LocalFile } from '../../types';
import { isLocalFile } from '../../util';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const capabilities = yield* Capability.Service;
    const registry = capabilities.get(Capabilities.AtomRegistry);
    const settingsAtom = capabilities.get(FileCapabilities.Settings);

    return Capability.contributes(Capabilities.ReactSurface, [
      Surface.create({
        id: `${meta.id}/article`,
        role: 'article',
        filter: (data): data is { subject: LocalFile } => isLocalFile(data.subject),
        component: ({ data }) => <LocalFileContainer file={data.subject} />,
      }),
      Surface.create({
        id: `${meta.id}/plugin-settings`,
        role: 'article',
        filter: (data): data is { subject: AppCapabilities.Settings } =>
          AppCapabilities.isSettings(data.subject) && data.subject.prefix === meta.id,
        component: ({ data: { subject } }) => {
          const { settings, updateSettings } = useSettingsState<FilesSettingsProps>(subject.atom);
          const state = useAtomCapability(FileCapabilities.State);
          return <FilesSettings settings={settings} state={state} onSettingsChange={updateSettings} />;
        },
      }),
      Surface.create({
        id: `${meta.id}/status`,
        role: 'status',
        filter: (data): data is Record<string, unknown> => {
          const settings = registry.get(settingsAtom);
          return !!settings.autoExport;
        },
        component: () => {
          const state = useAtomCapability(FileCapabilities.State);
          return <ExportStatus running={state.exportRunning} lastExport={state.lastExport} />;
        },
      }),
    ]);
  }),
);
