//
// Copyright 2025 DXOS.org
//

import { Capabilities, contributes, defineCapabilityModule } from '@dxos/app-framework';
import { live } from '@dxos/live-object';

import { meta } from '../meta';
import { type PresenterSettingsProps, PresenterSettingsSchema } from '../types';

export default defineCapabilityModule(() => {
  const settings = live<PresenterSettingsProps>({});

  return contributes(Capabilities.Settings, {
    prefix: meta.id,
    schema: PresenterSettingsSchema,
    value: settings,
  });
});
