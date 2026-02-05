//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import { withThemeByClassName } from '@storybook/addon-themes';
import { type Preview } from 'storybook-solidjs-vite';

import { withLayout } from './theme';

/**
 * Configure Storybook rendering.
 * https://storybook.js.org/docs/configure#configure-story-rendering
 *
 * NOTE: Do not depend on @dxos/storybook-utils in the root storybook config due to circular dependencies.
 */
export const preview: Preview = {
  // NOTE: Does not affect docs.
  decorators: [
    withLayout,
    withThemeByClassName({
      defaultTheme: 'dark',
      themes: {
        dark: 'dark',
        light: 'light',
      },
    }),
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
