//
// Copyright 2025 DXOS.org
//

import { Capabilities, contributes } from '@dxos/app-framework';
import { create } from '@dxos/live-object';

import { AUTOMATION_PLUGIN } from '../meta';
import { type AutomationSettingsProps, AutomationSettingsSchema } from '../types';

export default () => {
  const settings = create<AutomationSettingsProps>({});

  return contributes(Capabilities.Settings, {
    schema: AutomationSettingsSchema,
    prefix: AUTOMATION_PLUGIN,
    value: settings,
  });
};
