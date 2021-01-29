//
// Copyright 2020 DXOS.org
//

import { addons } from '@storybook/addons';

// https://storybook.js.org/docs/configurations/options-parameter/
addons.setConfig({
  isFullscreen: false,
  showNav: true,
  showPanel: true,
  panelPosition: 'bottom',
  sidebarAnimations: false,
  enableShortcuts: true,
  isToolshown: false,
  theme: undefined,
  selectedPanel: undefined,
  initialActive: 'sidebar',
  showRoots: false
});
