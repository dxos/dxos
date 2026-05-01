//
// Copyright 2026 DXOS.org
//

import { type Plugin } from '@dxos/app-framework';
import { trim } from '@dxos/util';

export const meta: Plugin.Meta = {
  id: 'org.dxos.plugin.trello',
  name: 'Trello',
  description: trim`
    Connect Trello to your workspace so boards and cards stay available alongside everything else you're doing.
  `,
  icon: 'ph--kanban--regular',
  iconHue: 'blue',
};
