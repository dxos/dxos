//
// Copyright 2025 DXOS.org
//

import { Capabilities, Capability } from '@dxos/app-framework';
import { live } from '@dxos/live-object';

import { meta } from '../meta';
import { type FilesSettingsProps, FilesSettingsSchema } from '../types';

export default Capability.makeModule(async () => {
  const settings = live<FilesSettingsProps>({
    autoExport: false,
    autoExportInterval: 30_000,
  });

  return Capability.contributes(Capabilities.Settings, {
    prefix: meta.id,
    schema: FilesSettingsSchema,
    value: settings,
  });
});
