//
// Copyright 2023 DXOS.org
//

import { type PluginMeta } from '@dxos/app-framework';
import { trim } from '@dxos/util';

export const meta: PluginMeta = {
  id: 'dxos.org/plugin/space',
  name: 'Spaces',
  description: trim`
    Core workspace container system for organizing and sharing collaborative environments.
    Create, manage, and share spaces with granular access control and invitation management.
  `,
  icon: 'ph--planet--regular',
};
