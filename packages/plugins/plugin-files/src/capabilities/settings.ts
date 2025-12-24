//
// Copyright 2025 DXOS.org
//

import { Capabilities, contributes, defineCapabilityModule } from '@dxos/app-framework';
import { live } from '@dxos/live-object';

import { meta } from '../meta';
import { type FilesSettingsProps, FilesSettingsSchema } from '../types';

export default defineCapabilityModule(async () => {
  const settings = live<FilesSettingsProps>({
    autoExport: false,
    autoExportInterval: 30_000,
  });

  return contributes(Capabilities.Settings, {
    prefix: meta.id,
    schema: FilesSettingsSchema,
    value: settings,
  });
});
