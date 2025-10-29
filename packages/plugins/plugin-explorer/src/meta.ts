//
// Copyright 2023 DXOS.org
//

import { type PluginMeta } from '@dxos/app-framework';
import { trim } from '@dxos/util';

export const meta: PluginMeta = {
  id: 'dxos.org/plugin/explorer',
  name: 'Explorer',
  description: trim`
    Interactive hypergraph visualization that reveals relationships between objects in your workspace.
    Navigate complex data structures and discover connections through a dynamic network view.
  `,
  icon: 'ph--graph--regular',
  iconHue: 'green',
  source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-explorer',
  tags: ['labs'],
  screenshots: ['https://dxos.network/plugin-details-explorer-dark.png'],
};
