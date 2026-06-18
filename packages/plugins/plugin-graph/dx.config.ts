//
// Copyright 2025 DXOS.org
//

import { defineConfig } from '@dxos/app-framework';
import { trim } from '@dxos/util';

export default defineConfig({
  plugin: {
    key: 'org.dxos.plugin.graph',
    name: 'Graph',
    description: trim`
      Graph database layer providing relationship modeling and queries for workspace objects.
      Build knowledge graphs and explore complex data relationships.
    `,
    tags: ['system'],
  },
});
