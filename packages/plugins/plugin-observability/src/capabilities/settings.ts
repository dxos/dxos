//
// Copyright 2025 DXOS.org
//

import { Capabilities, contributes, defineCapabilityModule } from '@dxos/app-framework';
import { live } from '@dxos/live-object';

import { type ObservabilitySettingsProps, ObservabilitySettingsSchema } from '../components';
import { meta } from '../meta';

export default defineCapabilityModule(() => {
  const settings = live<ObservabilitySettingsProps>({
    enabled: true,
  });

  return contributes(Capabilities.Settings, {
    prefix: meta.id,
    schema: ObservabilitySettingsSchema,
    value: settings,
  });
});
