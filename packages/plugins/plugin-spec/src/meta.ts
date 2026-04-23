//
// Copyright 2025 DXOS.org
//

import { type Plugin } from '@dxos/app-framework';
import { trim } from '@dxos/util';

export const meta: Plugin.Meta = {
  id: 'org.dxos.plugin.spec',
  name: 'Spec',
  description: trim`
    Spec plugin for structured specs with rich text content.
  `,
  icon: 'ph--flower-lotus--regular',
  iconHue: 'rose',
  source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-spec',
};
