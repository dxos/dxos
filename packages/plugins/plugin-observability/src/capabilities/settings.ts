//
// Copyright 2025 DXOS.org
//

import { Capabilities, contributes } from '@dxos/app-framework';
import { live } from '@dxos/live-object';

import { type ObservabilitySettingsProps, ObservabilitySettingsSchema } from '../components';
import { OBSERVABILITY_PLUGIN } from '../meta';

export default () => {
  const settings = live<ObservabilitySettingsProps>({ enabled: true });

  return contributes(Capabilities.Settings, {
    schema: ObservabilitySettingsSchema,
    prefix: OBSERVABILITY_PLUGIN,
    value: settings,
  });
};
