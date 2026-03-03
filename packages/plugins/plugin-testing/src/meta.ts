//
// Copyright 2023 DXOS.org
//

import { type Plugin } from '@dxos/app-framework';
import { trim } from '@dxos/util';

export const meta: Plugin.Meta = {
  id: 'dxos.org/plugin/storybook-layout',
  name: 'Storybook',
  description: trim`
    Development layout optimized for Storybook component testing and documentation.
    Provides specialized views for component development and design system exploration.
  `,
  source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-testing',
};
