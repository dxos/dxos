//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability, Common } from '@dxos/app-framework';
import { live } from '@dxos/live-object';

import { meta } from '../../meta';
import { type FilesSettingsProps, FilesSettingsSchema } from '../../types';

export default Capability.makeModule(() =>
  Effect.sync(() => {
    const settings = live<FilesSettingsProps>({
      autoExport: false,
      autoExportInterval: 30_000,
    });

    return Capability.contributes(Common.Capability.Settings, {
      prefix: meta.id,
      schema: FilesSettingsSchema,
      value: settings,
    });
  }),
);
