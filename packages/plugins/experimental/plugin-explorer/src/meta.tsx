//
// Copyright 2023 DXOS.org
//

import { pluginMeta } from '@dxos/app-framework';

export const EXPLORER_PLUGIN = 'dxos.org/plugin/explorer';

export default pluginMeta({
  id: EXPLORER_PLUGIN,
  name: 'Explorer',
  description: 'Explore the ECHO hypergraph.',
  tags: ['experimental'],
  iconSymbol: 'ph--graph--regular',
});
