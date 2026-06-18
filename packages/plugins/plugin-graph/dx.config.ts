//
// Copyright 2025 DXOS.org
//

import { Config2 } from '@dxos/app-framework/config';
import { trim } from '@dxos/util';

export default Config2.make({
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
