//
// Copyright 2022 DXOS.org
//

import { type Preview } from '@storybook/react';
import { themes } from '@storybook/theming';

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
    // https://storybook.js.org/addons/storybook-dark-mode
    darkMode: {
      dark: { ...themes.dark },
      light: { ...themes.normal },
    },
    options: {
      // TODO(burdon): Not called?
      storySort: {
        order: ['Default', '*'],
        method: 'alphabetical',
      },
      // storySort: (a: IndexEntry, b: IndexEntry) => {
      //   console.log('>>', a);
      //   return a.id === b.id ? 0 : a.id.localeCompare(b.id, undefined, { numeric: true });
      // }
    },
  },

  // https://storybook.js.org/docs/writing-stories/parameters#global-parameters
  // TODO(burdon): Replace with @storybook/addon-themes when released (change storybook sidebar theme, etc.)
  globalTypes: {
    theme: {
      name: 'Theme',
      description: 'Global theme for components.',
      defaultValue: 'light',
      toolbar: {
        items: [
          { value: 'light', icon: 'lightning', title: 'light' },
          { value: 'dark', icon: 'starhollow', title: 'dark' },
        ],
      },
    },
  },
};

export const parameters: Preview['parameters'] = preview.parameters;
export const globalTypes: Preview['globalTypes'] = preview.globalTypes;

export default preview;
