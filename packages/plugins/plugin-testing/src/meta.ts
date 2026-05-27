//
// Copyright 2023 DXOS.org
//

import { type Plugin } from '@dxos/app-framework';
import { DXN } from '@dxos/keys';
import { trim } from '@dxos/util';

export const meta: Plugin.Meta = {
  id: DXN.make('org.dxos.plugin.storybookLayout'),
  name: 'Storybook',
  author: 'DXOS',
  description: trim`
    Development layout optimized for Storybook component testing and documentation.
    Provides specialized views for component development and design system exploration.
  `,
  source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-testing',
};
