//
// Copyright 2025 DXOS.org
//

import { defineConfig } from '@dxos/app-framework';
import { trim } from '@dxos/util';

export default defineConfig({
  plugin: {
    key: 'org.dxos.plugin.storybookLayout',
    name: 'Storybook',
    description: trim`
      Development layout optimized for Storybook component testing and documentation.
      Provides specialized views for component development and design system exploration.
    `,
    source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-testing',
  },
});
