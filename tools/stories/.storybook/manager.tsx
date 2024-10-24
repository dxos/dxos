//
// Copyright 2023 DXOS.org
//

import { addons } from '@storybook/manager-api';
import { create } from '@storybook/theming';
import { UPDATE_DARK_MODE_EVENT_NAME } from 'storybook-dark-mode';

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
  },
});

const update = (darkMode: boolean) => {
  console.log('###', darkMode);
  addons.setConfig({
    theme: create({
      base: 'dark',
      brandTitle: 'DXOS',
      brandImage: '/dxos-horizontal-black.svg',
      brandTarget: '_blank',
      brandUrl: 'https://github.com/dxos',
    })
  })
}

const channel = addons.getChannel();

channel.on(UPDATE_DARK_MODE_EVENT_NAME, (darkMode) => update(darkMode));

update(true);

// window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (ev) => {
//   const newColorScheme = ev.matches ? 'dark' : 'light';
//   console.log('!!!', newColorScheme);
//   addons.setConfig({
//     theme: create({
//       base: newColorScheme,
//       brandImage: '/dxos-horizontal-black.svg',
//     }),
//   });
// });
