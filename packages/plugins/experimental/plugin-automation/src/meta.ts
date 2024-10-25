//
// Copyright 2023 DXOS.org
//

import { type PluginMeta } from '@dxos/app-framework';

export const AUTOMATION_PLUGIN = 'dxos.org/plugin/automation';

export default {
  id: AUTOMATION_PLUGIN,
  name: 'Automation',
  description: 'Automation workflows.',
  icon: 'ph--head-circuit--regular',
} satisfies PluginMeta;
