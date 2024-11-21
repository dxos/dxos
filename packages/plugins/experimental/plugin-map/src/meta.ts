//
// Copyright 2023 DXOS.org
//

import { type PluginMeta } from '@dxos/app-framework';

export const MAP_PLUGIN = 'dxos.org/plugin/map';

export default {
  id: MAP_PLUGIN,
  name: 'Maps',
  description: 'Display objects on maps.',
  icon: 'ph--compass--regular',
  source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/experimental/plugin-map',
  tags: ['experimental'],
} satisfies PluginMeta;
