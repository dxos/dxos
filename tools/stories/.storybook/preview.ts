//
// Copyright 2022 DXOS.org
//

import { type Preview } from '@storybook/react';
import { withThemeByClassName } from '@storybook/addon-themes';

import { DocsContainer, decorators, globalTypes } from '@dxos/storybook-utils';

import { docsTheme } from './theme';

/**
 * Configure Storybook rendering.
 * https://storybook.js.org/docs/configure#configure-story-rendering
 */
export const preview: Preview = {
  decorators: [
    ...decorators,
    // Does not affect docs.
    withThemeByClassName({ 
      defaultTheme: 'dark',
      themes: { 
        dark: 'dark',
        light: 'light'
      },
    }),
  ],
  globalTypes,

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
    docs: {
      inlineStories: true,
      container: DocsContainer,
      theme: docsTheme,
      source: {
        type: 'code',
      },
    },

    // Disables Chromatic's snapshotting on a global level.
    chromatic: {
      disableSnapshot: true,
    },
  },
};

export default preview;
