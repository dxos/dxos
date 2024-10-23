//
// Copyright 2023 DXOS.org
//

import { addons } from '@storybook/manager-api';
import { create } from '@storybook/theming';

console.log('### MANAGER ###');

/**
 * Referenced when story is previewed in browser.
 * UX state stored in Application/Storage/Local Storage: @storybook/manager/store
 * https://storybook.js.org/docs/configure/features-and-behavior
 */
addons.setConfig({
  enableShortcuts: true,
  showToolbar: true,
  sidebar: {
    showRoots: true,
    // renderLabel: (item) => {
    // const { id, parent, type, depth, name, importPath } = item;
    // console.log(item);
    // type = group > component > story
    // return `${type}/${name}`
    // return name;
    // },
  },
  theme: create({
    base: 'dark',
    brandTitle: 'DXOS',
    brandImage: '/dxos-horizontal-white.svg',
    brandTarget: '_self',
    brandUrl: 'https://github.com/dxos',
  }),
});
