//
// Copyright 2023 DXOS.org
//

import { type PluginMeta } from '@dxos/app-framework';

export const KANBAN_PLUGIN = 'dxos.org/plugin/kanban';

export default {
  id: KANBAN_PLUGIN,
  name: 'Kanban',
  description: 'Kanban board for managing tasks.',
  icon: 'ph--kanban--regular',
  source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/experimental/plugin-kanban',
  tags: ['experimental'],
} satisfies PluginMeta;
