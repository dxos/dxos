//
// Copyright 2025 DXOS.org
//
import { useAtomValue } from '@effect-atom/atom-react';
import * as Effect from 'effect/Effect';
import React from 'react';

import { Capability, Common } from '@dxos/app-framework';
import { useCapability } from '@dxos/app-framework/react';

import { ExportStatus, FilesSettings, LocalFileContainer } from '../../components';
import { meta } from '../../meta';
import { FileCapabilities, type FilesSettingsProps, type LocalFile } from '../../types';
import { isLocalFile } from '../../util';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const capabilities = yield* Capability.Service;
    const registry = capabilities.get(Common.Capability.AtomRegistry);
    const settingsAtom = capabilities.get(FileCapabilities.Settings);

    return Capability.contributes(Common.Capability.ReactSurface, [
      Common.createSurface({
        id: `${meta.id}/article`,
        role: 'article',
        filter: (data): data is { subject: LocalFile } => isLocalFile(data.subject),
        component: ({ data }) => <LocalFileContainer file={data.subject} />,
      }),
      Common.createSurface({
        id: `${meta.id}/plugin-settings`,
        role: 'article',
        filter: (data): data is { subject: Common.Capability.Settings } =>
          Common.Capability.isSettings(data.subject) && data.subject.prefix === meta.id,
        component: ({ data: { subject } }) => {
          const settings = useAtomValue(subject.atom) as FilesSettingsProps;
          const store = useCapability(FileCapabilities.State);
          return <FilesSettings settings={settings} state={store.values} />;
        },
      }),
      Common.createSurface({
        id: `${meta.id}/status`,
        role: 'status',
        filter: (data): data is Record<string, unknown> => {
          const settings = registry.get(settingsAtom);
          return !!settings.autoExport;
        },
        component: () => {
          const store = useCapability(FileCapabilities.State);
          return <ExportStatus running={store.values.exportRunning} lastExport={store.values.lastExport} />;
        },
      }),
    ]);
  }),
);
