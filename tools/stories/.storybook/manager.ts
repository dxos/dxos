//
// Copyright 2023 DXOS.org
//

import { addons } from '@storybook/manager-api';
import { create } from '@storybook/theming';
import { DARK_MODE_EVENT_NAME } from 'storybook-dark-mode';

/**
 * Referenced when story is previewed in browser.
 * UX state stored in Application/Storage/Local Storage: @storybook/manager/store
 * https://storybook.js.org/docs/configure/features-and-behavior
 */
addons.setConfig({
  enableShortcuts: true,
  // NOTE: Option is ignored, so we toggle the panel off below.
  showPanel: false,
});

addons.register('dxos', (api) => {
  const update = (darkMode: boolean) => {
    addons.setConfig({
      showPanel: false,

      theme: create({
        base: darkMode ? 'dark' : 'light',
        brandTitle: 'DXOS',
        brandImage: darkMode ? '/dxos-horizontal-white.png' : '/dxos-horizontal-black.png',
        brandTarget: '_blank',
        brandUrl: 'https://github.com/dxos',
      }),
    });
  };

  const currentDarkMode = undefined;
  const channel = addons.getChannel();
  channel.on(DARK_MODE_EVENT_NAME, (darkMode) => {
    if (currentDarkMode !== darkMode) {
      update(darkMode);
    }
  });

  // Hide add-on panel.
  const { showPanel } = addons.getConfig();
  api.togglePanel(showPanel);
});
