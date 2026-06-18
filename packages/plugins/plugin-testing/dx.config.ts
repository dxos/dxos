//
// Copyright 2025 DXOS.org
//

import { Config2 } from '@dxos/app-framework/config';
import { trim } from '@dxos/util';

export default Config2.make({
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
