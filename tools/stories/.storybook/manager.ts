//
// Copyright 2023 DXOS.org
//

import { addons } from '@storybook/manager-api';
import { create } from '@storybook/theming'

/**
 * https://storybook.js.org/docs/configure/features-and-behavior
 */
// TODO(burdon): Unsure if this has any effect?
addons.setConfig({
  enableShortcuts: true,
  showNav: true,
  showToolbar: true,
  showPanel: true,
  toolbar: {},
  theme: create({
    base: 'dark',
    brandTitle: 'DXOS',
    brandImage: '/dxos-horizontal-white.svg',
    brandTarget: '_self',
    brandUrl: 'https://github.com/dxos',
  })
});
