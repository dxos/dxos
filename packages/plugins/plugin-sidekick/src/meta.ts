//
// Copyright 2025 DXOS.org
//

import { type Plugin } from '@dxos/app-framework';
import { trim } from '@dxos/util';

export const meta: Plugin.Meta = {
  id: 'org.dxos.plugin.sidekick',
  name: 'Sidekick',
  description: trim`
    Personal companion agent that monitors activity, maintains profiles of people
    and the user, keeps a daily journal, and helps manage communications.
  `,
  icon: 'ph--brain--regular',
  iconHue: 'violet',
  source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-sidekick',
};
