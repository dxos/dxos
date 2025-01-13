//
// Copyright 2023 DXOS.org
//

import { type PluginMeta } from '@dxos/app-framework';

export const TABLE_PLUGIN = 'dxos.org/plugin/table';

export const meta = {
  id: TABLE_PLUGIN,
  name: 'Tables',
  description: 'Create and manage tables.',
  icon: 'ph--table--regular',
  source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-table',
} satisfies PluginMeta;
