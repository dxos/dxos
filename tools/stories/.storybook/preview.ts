//
// Copyright 2022 DXOS.org
//

import { type Preview } from '@storybook/react';
import { themes } from '@storybook/theming';
import { type IndexEntry } from '@storybook/types';

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

    // Disables Chromatic's snapshotting on a global level.
    chromatic: {
      disableSnapshot: true,
    },

    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/,
      },
    },

    // https://storybook.js.org/addons/storybook-dark-mode
    darkMode: {
      // TODO(burdon): This doesn't seem to work. Invalid value in Application/Store.
      //  https://github.com/hipstersmoothie/storybook-dark-mode/issues/234
      classTarget: 'html',
      stylePreview: true,
      dark: { ...themes.dark },
      darkClass: 'dark',
      light: { ...themes.light },
      lightClass: 'light',
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
        return a.id === b.id ? 0 : a.id.localeCompare(b.id, undefined, { numeric: true });
      },
    },
  },
};

export const parameters: Preview['parameters'] = preview.parameters;

export default preview;
