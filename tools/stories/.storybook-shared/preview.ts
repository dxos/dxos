//
// Copyright 2022 DXOS.org
//

import { type Preview } from '@storybook/react';

/**
 * Configure Storybook rendering.
 * https://storybook.js.org/docs/configure#configure-story-rendering
 */
const preview: Preview = {
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
    options: {
      // TODO(burdon): Not called.
      storySort: {
        // order: ['Introduction', 'Components', 'SDK', 'Apps', 'Plugins'],
        method: 'alphabetical',
      },
      // storySort: (a: IndexEntry, b: IndexEntry) => {
      //   console.log('>>', a);
      //   return a.id === b.id ? 0 : a.id.localeCompare(b.id, undefined, { numeric: true });
      // }
    },
  },

  // https://storybook.js.org/docs/writing-stories/parameters#global-parameters
  globalTypes: {
    theme: {
      name: 'Theme',
      description: 'Global theme for components.',
      defaultValue: 'light',
      toolbar: {
        // The icon for the toolbar item.
        icon: 'circlehollow',
        // Array of options.
        items: [
          { value: 'light', icon: 'circlehollow', title: 'light' },
          { value: 'dark', icon: 'circle', title: 'dark' },
        ],
      },
    },
  },
};

export const parameters = preview.parameters;
export const globalTypes = preview.globalTypes;

// export default preview;
