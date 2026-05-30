//
// Copyright 2026 DXOS.org
//

import { type Plugin } from '@dxos/app-framework';
import { trim } from '@dxos/util';

export const meta: Plugin.Meta = {
  id: 'org.dxos.plugin.product-search',
  name: 'Product Search',
  author: 'DXOS',
  description: trim`
    Structured product search across configurable vendor sites.
    Each vendor is described by an editable template that drives search and result extraction.
  `,
  icon: 'ph--shopping-cart--regular',
  iconHue: 'cyan',
  source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-product-search',
  spec: 'PLUGIN.mdl',
  version: '0.8.3',
  tags: ['labs'],
};
