//
// Copyright 2023 DXOS.org
//

import { type PluginMeta } from '@dxos/app-framework';

export const EXPLORER_PLUGIN = 'dxos.org/plugin/explorer';

export default {
  id: EXPLORER_PLUGIN,
  name: 'Explorer',
  description: 'Explore the ECHO hypergraph.',
  icon: 'ph--graph--regular',
  source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/experimental/plugin-explorer',
  tags: ['experimental'],
} satisfies PluginMeta;
