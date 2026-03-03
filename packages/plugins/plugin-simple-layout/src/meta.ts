//
// Copyright 2025 DXOS.org
//

import { type Plugin } from '@dxos/app-framework';
import { trim } from '@dxos/util';

export const meta: Plugin.Meta = {
  id: 'dxos.org/plugin/simple-layout',
  name: 'Simple Layout',
  description: trim`
    Minimal layout plugin for simplified UI contexts like popover windows.
    Provides basic content rendering without sidebars or complex navigation.
  `,
  icon: 'ph--layout--regular',
};
