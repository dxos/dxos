//
// Copyright 2025 DXOS.org
//

import { Capabilities, contributes } from '@dxos/app-framework';
import { live } from '@dxos/live-object';

import { meta } from '../meta';
import { FilesSettingsSchema, type FilesSettingsProps } from '../types';

export default async () => {
  const settings = live<FilesSettingsProps>({
    autoExport: false,
    autoExportInterval: 30_000,
  });

  return contributes(Capabilities.Settings, {
    prefix: meta.id,
    schema: FilesSettingsSchema,
    value: settings,
  });
};
