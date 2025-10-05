//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import { withThemeByClassName } from '@storybook/addon-themes';
import { type Preview } from '@storybook/web-components-vite';

import { withLayout, withTheme } from '@dxos/storybook-utils';

/**
 * Configure Storybook rendering.
 * https://storybook.js.org/docs/configure#configure-story-rendering
 */
export const preview: Preview = {
  decorators: [
    // Note: Does not affect docs.
    withThemeByClassName({
      defaultTheme: 'dark',
      themes: {
        dark: 'dark',
        light: 'light',
      },
    }),

    withLayout,
    withTheme,
  ],

  /**
   * Referenced when story is previewed in browser.
   * https://storybook.js.org/docs/writing-stories/parameters#global-parameters
   */
  parameters: {
    actions: {
      argTypesRegex: '^on.*',
    },
    backgrounds: {
      options: {},
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

export default preview;
