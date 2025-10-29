//
// Copyright 2023 DXOS.org
//

import { type PluginMeta } from '@dxos/app-framework';
import { trim } from '@dxos/util';

export const meta: PluginMeta = {
  id: 'dxos.org/plugin/table',
  name: 'Tables',
  description: trim`
    Powerful relational database tables with custom columns, sorting, and filtering capabilities.
    Build structured data models with relationships between tables and export to multiple formats.
  `,
  icon: 'ph--table--regular',
  iconHue: 'green',
  source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-table',
  screenshots: ['https://dxos.network/plugin-details-tables-dark.png'],
};
