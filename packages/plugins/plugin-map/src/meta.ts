//
// Copyright 2023 DXOS.org
//

import { type PluginMeta } from '@dxos/app-framework';

export const MAP_PLUGIN = 'dxos.org/plugin/map';

export const meta = {
  id: MAP_PLUGIN,
  name: 'Maps',
  description: `Activate Maps to plot data from your tables on an interactive globe. Just add Lat/Long fields to your schema to see them on a map. You can also plot points on the map while chatting with your AI assistant.`,
  icon: 'ph--compass--regular',
  source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/experimental/plugin-map',
  tags: ['experimental'],
  screenshots: ['https://dxos.network/plugin-details-map-dark.png'],
} satisfies PluginMeta;
