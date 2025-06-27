//
// Copyright 2023 DXOS.org
//

import { create } from 'storybook/theming';
import { addons } from 'storybook/manager-api';

addons.setConfig({
  theme: create({
    base: 'dark',
    brandTitle: 'DXOS',
    brandUrl: 'https://github.com/dxos',
    brandImage: '/dxos.png',
    brandTarget: '_self',
  }),
});
