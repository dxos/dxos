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
   * https://storybook.js.org/docs/essentials/toolbars-and-globals
   */
  globalTypes: {
    locale: {
      title: 'fucker',
      description: 'DX logging level.',
      toolbar: {
        icon: 'globe', // print
        items: [
          { value: 'en', right: '🇺🇸', title: 'English' },
          { value: 'fr', right: '🇫🇷', title: 'Français' },
        ]
      }
    }
  },
  initialGlobals: {
    locale: 'en',
  },

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
        console.log(a);
        return a.id === b.id ? 0 : a.id.localeCompare(b.id, undefined, { numeric: true });
      },
    },
  },
};

export const globalTypes: Preview['globalTypes'] = preview.globalTypes;
export const parameters: Preview['parameters'] = preview.parameters;

console.log(JSON.stringify(preview, null, 2));

export default preview;
