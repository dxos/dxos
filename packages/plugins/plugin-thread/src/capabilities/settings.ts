//
// Copyright 2025 DXOS.org
//

import { Capabilities, contributes, defineCapabilityModule } from '@dxos/app-framework';
import { live } from '@dxos/live-object';

import { meta } from '../meta';
import { type ThreadSettingsProps, ThreadSettingsSchema } from '../types';

export default defineCapabilityModule(() => {
  const settings = live<ThreadSettingsProps>({});

  return contributes(Capabilities.Settings, {
    prefix: meta.id,
    schema: ThreadSettingsSchema,
    value: settings,
  });
});
