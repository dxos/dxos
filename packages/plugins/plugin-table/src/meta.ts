//
// Copyright 2023 DXOS.org
//

import { type PluginMeta } from '@dxos/app-framework';

export const TABLE_PLUGIN = 'dxos.org/plugin/table';

export default {
  id: TABLE_PLUGIN,
  name: 'Tables',
  description: 'Create and manage tables.',
  icon: 'ph--table--regular',
} satisfies PluginMeta;
