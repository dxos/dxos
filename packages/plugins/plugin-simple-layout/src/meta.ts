//
// Copyright 2025 DXOS.org
//

import { type Plugin } from '@dxos/app-framework';
import { trim } from '@dxos/util';
import { DXN } from '@dxos/keys';

export const meta: Plugin.Meta = {
  id: DXN.make('org.dxos.plugin.simpleLayout'),
  name: 'Simple Layout',
  author: 'DXOS',
  description: trim`
    Minimal layout plugin for simplified UI contexts like popover windows.
    Provides basic content rendering without sidebars or complex navigation.
  `,
  icon: 'ph--layout--regular',
  tags: ['system'],
};
