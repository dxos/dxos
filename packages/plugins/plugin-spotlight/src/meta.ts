//
// Copyright 2025 DXOS.org
//

import { type Plugin } from '@dxos/app-framework';
import { trim } from '@dxos/util';

export const meta: Plugin.Meta = {
  id: 'org.dxos.plugin.spotlight',
  name: 'Spotlight',
  description: trim`
    Spotlight search plugin for the Tauri popover window.
    Renders the commands dialog as the primary content.
  `,
  icon: 'ph--magnifying-glass--regular',
};
