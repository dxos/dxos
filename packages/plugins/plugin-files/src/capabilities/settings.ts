//
// Copyright 2025 DXOS.org
//

import { Capabilities, contributes } from '@dxos/app-framework';
import { live } from '@dxos/live-object';

import { FILES_PLUGIN } from '../meta';
import { FilesSettingsSchema, type FilesSettingsProps } from '../types';

export default async () => {
  const settings = live<FilesSettingsProps>({
    autoExport: false,
    autoExportInterval: 30_000,
  });

  return contributes(Capabilities.Settings, { schema: FilesSettingsSchema, prefix: FILES_PLUGIN, value: settings });
};
