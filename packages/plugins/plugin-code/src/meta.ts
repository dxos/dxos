//
// Copyright 2025 DXOS.org
//

import { type Plugin } from '@dxos/app-framework';
import { trim } from '@dxos/util';

import specContent from '../PLUGIN.mdl?raw';

export const meta: Plugin.Meta = {
  id: 'org.dxos.plugin.code',
  name: 'Code',
  description: trim`
    Composer plugin for AI-assisted plugin development.
    Authors DEUS specs and dispatches a build agent that generates Composer plugins.
  `,
  icon: 'ph--code--regular',
  iconHue: 'indigo',
  source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-code',
  spec: 'https://github.com/dxos/dxos/blob/main/packages/plugins/plugin-code/PLUGIN.mdl',
  specContent,
};
