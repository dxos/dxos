//
// Copyright 2023 DXOS.org
//

import { type Plugin } from '@dxos/app-framework';
import { trim } from '@dxos/util';

export const meta: Plugin.Meta = {
  id: 'dxos.org/plugin/kanban',
  name: 'Kanban',
  description: trim`
    Visual project management using customizable kanban boards to track workflow progress.
    Organize table data into columns, drag and drop items between stages, and trigger automations based on status changes.
  `,
  icon: 'ph--kanban--regular',
  iconHue: 'green',
  source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-kanban',
  screenshots: ['https://dxos.network/plugin-details-kanban-dark.png'],
};
