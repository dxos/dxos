//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';
import { createKvsStore } from '@dxos/effect';

import { meta } from '../../meta';
import { FileCapabilities, FilesSettingsSchema } from '../../types';

export default Capability.makeModule(() =>
  Effect.sync(() => {
    const settingsAtom = createKvsStore({
      key: meta.id,
      schema: FilesSettingsSchema,
      defaultValue: () => ({
        autoExport: false,
        autoExportInterval: 30_000,
      }),
    });

    return [
      Capability.contributes(FileCapabilities.Settings, settingsAtom),
      Capability.contributes(AppCapabilities.Settings, {
        prefix: meta.id,
        schema: FilesSettingsSchema,
        atom: settingsAtom,
      }),
    ];
  }),
);
