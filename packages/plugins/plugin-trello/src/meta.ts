//
// Copyright 2026 DXOS.org
//

import { type Plugin } from '@dxos/app-framework';
import { trim } from '@dxos/util';

export const meta: Plugin.Meta = {
  id: 'org.dxos.plugin.trello',
  name: 'Trello',
  description: trim`
    Sync Trello boards into the integration mechanism. Each Trello board becomes a Kanban,
    each card becomes an Expando. Selection happens through the generic Integration UI;
    this plugin contributes the service-specific operations.
  `,
  icon: 'ph--kanban--regular',
  iconHue: 'blue',
};
