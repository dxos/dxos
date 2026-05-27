//
// Copyright 2023 DXOS.org
//

import { type Plugin } from '@dxos/app-framework';
import { DXN } from '@dxos/keys';
import { trim } from '@dxos/util';

export const meta: Plugin.Meta = {
  id: DXN.make('org.dxos.plugin.graph'),
  name: 'Graph',
  author: 'DXOS',
  description: trim`
    Graph database layer providing relationship modeling and queries for workspace objects.
    Build knowledge graphs and explore complex data relationships.
  `,
  tags: ['system'],
};
