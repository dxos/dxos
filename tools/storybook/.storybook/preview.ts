//
// Copyright 2022 DXOS.org
//

import '@dxos-theme';

import { withThemeByClassName } from '@storybook/addon-themes';
import { type Preview } from '@storybook/react';

import { docsTheme, withLayout } from './theme';

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
      backgrounds: { default: 'dark' },
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
      // TODO(burdon): Move from storybook-utils.
      // container: DocsContainer,
      theme: docsTheme,
      source: {
        type: 'code',
      },
    },

    // Disables Chromatic's snapshotting on a global level.
    chromatic: {
      disableSnapshot: true,
    },

    options: {
      // This must be defined inline and may not include TS type defs.
      // https://storybook.js.org/docs/api/parameters#optionsstorysort
      // https://storybook.js.org/docs/writing-stories/naming-components-and-hierarchy#sorting-stories
      // @ts-ignore
      storySort: (a, b) => {
        if (a.title === b.title && a.type === 'docs' && b.type !== 'docs') {
          return -1;
        }

        return a.title === b.title ? 0 : a.id.localeCompare(b.id, undefined, { numeric: true });
      },
    },
  },
};

export default preview;
