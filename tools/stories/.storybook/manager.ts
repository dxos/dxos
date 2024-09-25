//
// Copyright 2023 DXOS.org
//

import { addons } from '@storybook/manager-api';
import { create } from '@storybook/theming'

/**
 * https://storybook.js.org/docs/configure/features-and-behavior
 * UX state stored in Application/Storage/Local Storage: @storybook/manager/store
 */
addons.setConfig({
  enableShortcuts: true,
  showToolbar: true,
  theme: create({
    base: 'dark',
    brandTitle: 'DXOS',
    brandImage: '/dxos-horizontal-white.svg',
    brandTarget: '_self',
    brandUrl: 'https://github.com/dxos',
  })
});
