//
// Copyright 2023 DXOS.org
//

import { type PluginMeta } from '@dxos/app-framework';

export const KANBAN_PLUGIN = 'dxos.org/plugin/kanban';

export const meta: PluginMeta = {
  id: KANBAN_PLUGIN,
  name: 'Kanban',
  description:
    'Kanban allows you to explore Table data in sorted columns defined by your custom schema. You can use Kanbans to track progress or trigger custom automations when cards are moved from one state to another.',
  icon: 'ph--kanban--regular',
  source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/experimental/plugin-kanban',
  tags: ['experimental'],
  screenshots: ['https://dxos.network/plugin-details-kanban-dark.png'],
};
