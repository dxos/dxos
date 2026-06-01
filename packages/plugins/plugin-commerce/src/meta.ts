//
// Copyright 2026 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { DXN } from '@dxos/keys';
import { trim } from '@dxos/util';

export const meta = Plugin.makeMeta({
  key: DXN.make('org.dxos.plugin.commerce', '0.8.3'),
  name: 'Commerce',
  author: 'DXOS',
  description: trim`
    Structured product search across configurable vendor sites.
    Each vendor is described by an editable template that drives search and result extraction.
  `,
  icon: 'ph--shopping-cart--regular',
  iconHue: 'cyan',
  source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-commerce',
  spec: 'PLUGIN.mdl',
  tags: ['labs'],
});
