//
// Copyright 2023 DXOS.org
//

import { type Plugin } from '@dxos/app-framework';
import { trim } from '@dxos/util';

export const meta: Plugin.Meta = {
  id: 'dxos.org/plugin/graph',
  name: 'Graph',
  description: trim`
    Graph database layer providing relationship modeling and queries for workspace objects.
    Build knowledge graphs and explore complex data relationships.
  `,
};
