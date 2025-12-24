//
// Copyright 2025 DXOS.org
//

import { Capabilities, contributes, defineCapabilityModule } from '@dxos/app-framework';
import { live } from '@dxos/live-object';

import { meta } from '../meta';
import { Assistant } from '../types';

export default defineCapabilityModule(() => {
  const settings = live<Assistant.Settings>({});

  return contributes(Capabilities.Settings, {
    prefix: meta.id,
    schema: Assistant.Settings,
    value: settings,
  });
});
