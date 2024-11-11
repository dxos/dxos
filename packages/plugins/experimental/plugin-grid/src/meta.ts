//
// Copyright 2023 DXOS.org
//

import { type PluginMeta } from '@dxos/app-framework';

export const GRID_PLUGIN = 'dxos.org/plugin/grid';

export default {
  id: GRID_PLUGIN,
  name: 'Grid',
  description: 'Place objects as cards on a grid.',
  icon: 'ph--squares-four--regular',
  source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/experimental/plugin-grid',
  tags: ['experimental'],
} satisfies PluginMeta;
