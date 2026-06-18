//
// Copyright 2025 DXOS.org
//

import { defineConfig } from '@dxos/app-framework';
import { trim } from '@dxos/util';

export default defineConfig({
  plugin: {
    key: 'org.dxos.plugin.preview',
    name: 'Preview',
    description: trim`
      Rich preview panel for viewing object content without opening full editors.
      Quick peek at documents, images, and data with inline rendering.
    `,
    icon: { key: 'ph--eye--regular' },
    source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-preview',
    tags: ['system'],
  },
});
