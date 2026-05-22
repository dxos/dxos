//
// Copyright 2025 DXOS.org
//

import { type Plugin } from '@dxos/app-framework';
import { trim } from '@dxos/util';

export const meta: Plugin.Meta = {
  id: 'org.dxos.plugin.code',
  name: 'Code',
  author: 'DXOS',
  description: trim`
    Composer plugin for AI-assisted plugin development.
    Authors DEUS specs and dispatches a build agent that generates Composer plugins.
  `,
  icon: 'ph--code--regular',
  iconHue: 'indigo',
  source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-code',
  spec: 'PLUGIN.mdl',
  version: '0.1.0',
  tags: ['labs'],
};
