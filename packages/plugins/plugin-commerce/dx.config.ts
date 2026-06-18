//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '@dxos/app-framework';
import { trim } from '@dxos/util';

export default defineConfig({
  plugin: {
    key: 'org.dxos.plugin.commerce',
    name: 'Commerce',
    description: trim`
      Structured product search across configurable vendor sites.
      Each vendor is described by an editable template that drives search and result extraction.
    `,
    icon: { key: 'ph--shopping-cart--regular', hue: 'cyan' },
    source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-commerce',
    spec: 'PLUGIN.mdl',
    tags: ['labs'],
  },
});
