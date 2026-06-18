//
// Copyright 2025 DXOS.org
//

import { Config2 } from '@dxos/app-framework/config';
import { trim } from '@dxos/util';

export default Config2.make({
  plugin: {
    key: 'org.dxos.plugin.template',
    name: 'Template',
    author: 'DXOS',
    description: trim`
      Create reusable templates for documents, tables, and other objects.
      Define structured patterns that can be quickly instantiated with pre-configured content and settings.
    `,
    source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-template',
    icon: { key: 'ph--asterisk--regular', hue: 'sky' },
  },
});
