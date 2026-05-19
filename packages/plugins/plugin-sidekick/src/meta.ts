//
// Copyright 2025 DXOS.org
//

import { type Plugin } from '@dxos/app-framework';
import { trim } from '@dxos/util';

import specContent from '../PLUGIN.mdl?raw';

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
  spec: 'https://github.com/dxos/dxos/blob/main/packages/plugins/plugin-sidekick/PLUGIN.mdl',
  specContent,
};
