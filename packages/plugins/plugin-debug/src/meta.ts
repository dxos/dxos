//
// Copyright 2023 DXOS.org
//

import { type PluginMeta } from '@dxos/app-framework';

export const DEBUG_PLUGIN = 'dxos.org/plugin/debug';

export const meta: PluginMeta = {
  id: DEBUG_PLUGIN,
  name: 'Debug',
  description:
    'The debug plugin is useful for troubleshooting inside of Composer. You can also use the Debug plugin to create test data inside of sheets or tables or explore pre-built automations. Non-technical users will likely not spend much time here, but this plugin is invaluable for developers and technical users.',
  icon: 'ph--bug--regular',
  source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-debug',
  tags: ['experimental'],
  screenshots: ['https://dxos.network/plugin-details-debug-dark.png'],
};
