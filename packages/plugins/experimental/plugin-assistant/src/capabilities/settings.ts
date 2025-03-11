//
// Copyright 2025 DXOS.org
//

import { Capabilities, contributes } from '@dxos/app-framework';
import { create } from '@dxos/live-object';

import { ASSISTANT_PLUGIN } from '../meta';
import { type AssistantSettingsProps, AssistantSettingsSchema } from '../types';

export default () => {
  const settings = create<AssistantSettingsProps>({});

  return contributes(Capabilities.Settings, {
    schema: AssistantSettingsSchema,
    prefix: ASSISTANT_PLUGIN,
    value: settings,
  });
};
