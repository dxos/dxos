//
// Copyright 2023 DXOS.org
//

import { addons } from '@storybook/manager-api';
import { create } from '@storybook/theming';

/**
 * Referenced when story is previewed in browser.
 * UX state stored in Application/Storage/Local Storage: @storybook/manager/store
 * https://storybook.js.org/docs/configure/features-and-behavior
 */
addons.setConfig({
  enableShortcuts: true,
  theme: create({
    base: 'dark',
    brandTitle: 'DXOS',
    brandImage: '/dxos.png',
    brandTarget: '_blank',
    brandUrl: 'https://github.com/dxos',
  }),
});
