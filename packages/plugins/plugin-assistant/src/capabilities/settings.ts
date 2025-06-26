//
// Copyright 2025 DXOS.org
//

import { Capabilities, contributes } from '@dxos/app-framework';
import { live } from '@dxos/live-object';

import { meta } from '../meta';
import { type AssistantSettingsProps, AssistantSettingsSchema } from '../types';

export default () => {
  const settings = live<AssistantSettingsProps>({});

  return contributes(Capabilities.Settings, {
    prefix: meta.id,
    schema: AssistantSettingsSchema,
    value: settings,
  });
};
