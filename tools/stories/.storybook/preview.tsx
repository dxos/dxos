//
// Copyright 2022 DXOS.org
//

import { type Preview } from '@storybook/react';
import React, { memo, useEffect } from 'react';

import { log, LogLevel } from '@dxos/log';

/**
 * Configure Storybook rendering.
 * https://storybook.js.org/docs/configure#configure-story-rendering
 */
export const preview: Preview = {
  /**
   * Global decorators.
   * https://storybook.js.org/docs/writing-stories/decorators
   */
  decorators: [
    // Theme.
    (Story, context) => {
      // Prevent re-rendering of the story.
      const MemoizedStory = memo(Story);

      // Update root element for tailwindcss.
      document.documentElement.classList[context.globals.theme === 'dark' ? 'add' : 'remove']('dark');

      return <MemoizedStory />;
    },

    // Logging.
    (Story, context) => {
      // Prevent re-rendering of the story.
      const MemoizedStory = memo(Story);

      const { logLevel } = context.globals;
      useEffect(() => {
        log.config({ filter: logLevel });
      }, [logLevel]);

      return <MemoizedStory />;
    },
  ],

  /**
   * https://storybook.js.org/docs/essentials/toolbars-and-globals
   */
  globalTypes: {
    // NOTE: The theme is applied in the withTheme decorator in storybook-utils.
    theme: {
      name: 'Theme',
      description: 'Switch between dark and light theme',
      defaultValue: 'dark',
      toolbar: {
        icon: 'sun',
        items: ['dark', 'light'],
      },
    },

    logLevel: {
      name: 'Log level',
      description: 'DX logging level.',
      defaultValue: 'INFO',
      toolbar: {
        icon: 'alert',
        items: [
          { value: LogLevel.ERROR, title: 'ERROR' },
          { value: LogLevel.WARN, title: 'WARN' },
          { value: LogLevel.INFO, title: 'INFO' },
          { value: LogLevel.DEBUG, title: 'DEBUG' },
          { value: LogLevel.TRACE, title: 'TRACE' },
        ],
      },
    },
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
  },
};

export default preview;
