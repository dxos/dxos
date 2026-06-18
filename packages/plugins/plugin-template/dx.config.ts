//
// Copyright 2025 DXOS.org
//

import { defineConfig } from '@dxos/app-framework';
import { trim } from '@dxos/util';

export default defineConfig({
  plugin: {
    key: 'org.dxos.plugin.template',
    name: 'Template',
    description: trim`
      Create reusable templates for documents, tables, and other objects.
      Define structured patterns that can be quickly instantiated with pre-configured content and settings.
    `,
    source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-template',
    icon: { key: 'ph--asterisk--regular', hue: 'sky' },
  },
});
