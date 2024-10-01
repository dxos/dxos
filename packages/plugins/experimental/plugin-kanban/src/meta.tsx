//
// Copyright 2023 DXOS.org
//

import { pluginMeta } from '@dxos/app-framework';

export const KANBAN_PLUGIN = 'dxos.org/plugin/kanban';

export default pluginMeta({
  id: KANBAN_PLUGIN,
  name: 'Kanban',
  description: 'Kanban board for managing tasks.',
  tags: ['experimental'],
  icon: 'ph--kanban--regular',
});
