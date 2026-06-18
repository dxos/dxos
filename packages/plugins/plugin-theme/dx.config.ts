//
// Copyright 2025 DXOS.org
//

import { defineConfig } from '@dxos/app-framework';
import { trim } from '@dxos/util';

export default defineConfig({
  plugin: {
    key: 'org.dxos.plugin.theme',
    name: 'Theme',
    description: trim`
      Core theming engine providing consistent visual styling across the workspace.
      Switch between light and dark modes and apply custom theme configurations.
    `,
    tags: ['system'],
  },
});
