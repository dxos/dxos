//
// Copyright 2023 DXOS.org
//

import { addons } from 'storybook/manager-api';

import { dxosTheme } from './theme';

/**
 * Referenced when story is previewed in browser.
 * UX state stored in Application/Storage/Local Storage: @storybook/manager/store
 * https://storybook.js.org/docs/configure/features-and-behavior
 */
addons.setConfig({
  enableShortcuts: true,
  theme: dxosTheme,
});
