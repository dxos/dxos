//
// Copyright 2023 DXOS.org
//

import { addons } from '@storybook/manager-api';

/**
 * https://storybook.js.org/docs/configure/features-and-behavior
 */
// TODO(burdon): Unsure if this has any effect.
addons.setConfig({
  enableShortcuts: false,
  showNav: false,
  showToolbar: true,
  showPanel: false,
});
