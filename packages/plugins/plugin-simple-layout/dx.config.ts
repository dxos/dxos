//
// Copyright 2025 DXOS.org
//

import { Config2 } from '@dxos/app-framework/config';
import { trim } from '@dxos/util';

export default Config2.make({
  plugin: {
    key: 'org.dxos.plugin.simpleLayout',
    name: 'Simple Layout',
    description: trim`
      Minimal layout plugin for simplified UI contexts like popover windows.
      Provides basic content rendering without sidebars or complex navigation.
    `,
    icon: { key: 'ph--layout--regular' },
    tags: ['system'],
  },
});
