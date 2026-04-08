//
// Copyright 2025 DXOS.org
//

import { type Plugin } from '@dxos/app-framework';
import { trim } from '@dxos/util';

export const meta: Plugin.Meta = {
  id: 'org.dxos.plugin.deus',
  name: 'Deus',
  description: trim`
    Deus plugin for structured specs with rich text content.
  `,
  icon: 'ph--flower-lotus--regular',
  iconHue: 'lime',
  source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-deus',
};
