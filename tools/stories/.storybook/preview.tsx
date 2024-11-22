//
// Copyright 2022 DXOS.org
//

import { type Decorator, type Preview } from '@storybook/react';
import { themes } from '@storybook/theming';
import React, { memo, useEffect } from 'react';

import { log, LogLevel } from '@dxos/log';

/**
 * Global decorators.
 * https://storybook.js.org/docs/writing-stories/decorators
 */
export const decorators: Decorator[] = [
  (Story, context) => {
    // Prevent re-rendering of the story.
    const MemoizedStory = memo(Story);
    const { logLevel } = context.globals;
    useEffect(() => {
      log.config({
        filter: logLevel,
      });
    }, [logLevel]);

    return <MemoizedStory />;
  },
];

/**
 * Configure Storybook rendering.
 * https://storybook.js.org/docs/configure#configure-story-rendering
 */
export const preview: Preview = {
  /**
   * https://storybook.js.org/docs/essentials/toolbars-and-globals
   */
  globalTypes: {
    logLevel: {
      description: 'DX logging level.',
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

  initialGlobals: {
    logLevel: 'INFO',
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
  },
};
