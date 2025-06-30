//
// Copyright 2024 DXOS.org
//

import { type Preview } from '@storybook/web-components';

import { decorators, globalTypes } from '@dxos/storybook-utils';

/**
 * Configure Storybook rendering.
 * https://storybook.js.org/docs/configure#configure-story-rendering
 */
export const preview: Preview = {
  decorators,
  globalTypes,

  /**
   * Referenced when story is previewed in browser.
   * https://storybook.js.org/docs/writing-stories/parameters#global-parameters
   */
  parameters: {
    // Disables Chromatic's snapshotting on a global level.
    chromatic: {
      disableSnapshot: true,
    },

    controls: {
      // https://storybook.js.org/docs/essentials/controls#custom-control-type-matchers
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/,
      },
    },
  },
};

export default preview;
