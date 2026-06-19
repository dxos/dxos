//
// Copyright 2025 DXOS.org
//

import { Config2 } from '@dxos/app-framework/config';
import { trim } from '@dxos/util';

export default Config2.make({
  plugin: {
    key: 'org.dxos.plugin.theme',
    name: 'Theme',
    author: 'DXOS',
    description: trim`
      Core theming engine providing consistent visual styling across the workspace.
      Switch between light and dark modes and apply custom theme configurations.
    `,
    tags: ['system'],
  },
});
