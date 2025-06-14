//
// Copyright 2023 DXOS.org
//

import { type PluginMeta } from '@dxos/app-framework';

export const EXPLORER_PLUGIN = 'dxos.org/plugin/explorer';

export const meta: PluginMeta = {
  id: EXPLORER_PLUGIN,
  name: 'Explorer',
  description: 'Install this plugin to view a hypergraph of all objects inside of your Space.',
  icon: 'ph--graph--regular',
  source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-explorer',
  tags: ['labs'],
  screenshots: ['https://dxos.network/plugin-details-explorer-dark.png'],
};
