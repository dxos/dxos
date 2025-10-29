//
// Copyright 2023 DXOS.org
//

import { type PluginMeta } from '@dxos/app-framework';
import { trim } from '@dxos/util';

export const meta: PluginMeta = {
  id: 'dxos.org/plugin/help',
  name: 'Help',
  description: trim`
    Built-in help system with documentation, tutorials, and contextual assistance.
    Access keyboard shortcuts, feature guides, and support resources.
  `,
  icon: 'ph--info--regular',
};
