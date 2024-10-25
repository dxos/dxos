//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import { type Preview } from '@storybook/web-components';

/**
 * Configure Storybook rendering.
 * https://storybook.js.org/docs/configure#configure-story-rendering
 */
export const preview: Preview = {
  // https://storybook.js.org/docs/writing-stories/parameters#global-parameters
  parameters: {
    actions: {
      argTypesRegex: '^on[A-Z].*',
    },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/,
      },
    },
    // Disables Chromatic's snapshotting on a global level.
    chromatic: {
      disableSnapshot: true,
    },
  },
};
