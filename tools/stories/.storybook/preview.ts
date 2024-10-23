//
// Copyright 2022 DXOS.org
//

import { type Preview } from '@storybook/react';
import { themes } from '@storybook/theming';
import { type IndexEntry } from '@storybook/types';

console.log('### PREVIEW ###');

/**
 * Configure Storybook rendering.
 * https://storybook.js.org/docs/configure#configure-story-rendering
 */
const preview: Preview = {
  /**
   * Referenced when story is previewed in browser.
   * https://storybook.js.org/docs/writing-stories/parameters#global-parameters
   */
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

    // https://storybook.js.org/addons/storybook-dark-mode
    darkMode: {
      classTarget: 'html',
      stylePreview: false,
      dark: { ...themes.dark },
      darkClass: 'dark',
      light: { ...themes.light },
      lightClass: 'dark',
    },

    // https://storybook.js.org/docs/api/parameters#options
    options: {
      // https://storybook.js.org/docs/writing-stories/naming-components-and-hierarchy#sorting-stories
      // TODO(burdon): storySort isn't working (listed in order stories are added in main.mts)?
      // storySort: {
      //   order: ['Default', '*'],
      //   method: 'alphabetical-by-kind',
      // },
      storySort: (a: IndexEntry, b: IndexEntry) => {
        console.log('>>>>', a, b);
        return a.id === b.id ? 0 : a.id.localeCompare(b.id, undefined, { numeric: true });
      },
    },
  }
};

export default preview;
