//
// Copyright 2022 DXOS.org
//

import { type Preview } from '@storybook/react';
import { themes } from '@storybook/theming';
import { IndexEntry } from '@storybook/types';

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
    // TODO(burdon): Doesn't automatically respond to system changes. Integrate with ThemeProvider.
    // https://storybook.js.org/addons/storybook-dark-mode
    darkMode: {
      classTarget: 'html',
      stylePreview: true,
      dark: { ...themes.dark },
      darkClass: 'dark',
      light: { ...themes.light },
      lightClass: 'dark',
      // TODO(burdon): This is ignored.
      // current: 'light'
    },
    options: {
      // https://storybook.js.org/docs/writing-stories/naming-components-and-hierarchy#sorting-stories
      // storySort: {
      //   order: ['Default', '*'],
      //   method: 'alphabetical',
      // },
      // TODO(burdon): This isn't called.
      storySort: (a: IndexEntry, b: IndexEntry) => {
        return a.id === b.id ? 0 : a.id.localeCompare(b.id, undefined, { numeric: true });
      }
    },
  },

  // https://storybook.js.org/docs/writing-stories/parameters#global-parameters
  // https://storybook.js.org/addons/@storybook/addon-themes
  // https://github.com/storybookjs/storybook/blob/next/code/addons/themes/docs/getting-started/tailwind.md
  globalTypes: {
    theme: {
      name: 'Theme',
      toolbar: {
        items: [
          { value: 'dark', icon: 'sun', title: 'dark' },
          { value: 'light', icon: 'moon', title: 'light' },
        ],
      },
    },
  },
};

export const parameters: Preview['parameters'] = preview.parameters;
export const globalTypes: Preview['globalTypes'] = preview.globalTypes;

export default preview;
