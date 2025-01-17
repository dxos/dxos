//
// Copyright 2023 DXOS.org
//

import { type PluginMeta } from '@dxos/app-framework';

export const CALLS_PLUGIN = 'dxos.org/plugin/calls';

export const meta = {
  id: CALLS_PLUGIN,
  name: 'Calls',
  description: 'Perform video calls.',
  icon: 'ph--phone-call--regular',
  source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-calls',
  tags: ['experimental'],
} satisfies PluginMeta;
