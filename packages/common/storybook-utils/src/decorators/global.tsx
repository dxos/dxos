//
// Copyright 2025 DXOS.org
//

import { type Preview } from '@storybook/react';
import React, { memo, useEffect } from 'react';

import { log, LogLevel } from '@dxos/log';

/**
 * Global decorators.
 * https://storybook.js.org/docs/writing-stories/decorators
 */
export const decorators: Preview['decorators'] = [
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
];

/**
 * These definitions add controls to the toolbar.
 * https://storybook.js.org/docs/essentials/toolbars-and-globals
 */
export const globalTypes: Preview['globalTypes'] = {
  // NOTE: The theme is applied in the withTheme decorator in storybook-utils.
  theme: {
    name: 'Theme',
    description: 'Switch between dark and light theme',
    defaultValue: 'dark',
    toolbar: {
      title: 'Theme',
      icon: 'sun',
      items: ['dark', 'light'],
      dynamicTitle: true,
    },
  },

  logLevel: {
    name: 'Log level',
    description: 'DX logging level.',
    defaultValue: 'INFO',
    toolbar: {
      title: 'doclist',
      icon: 'eye',
      items: [
        { value: LogLevel.ERROR, title: 'ERROR' },
        { value: LogLevel.WARN, title: 'WARN' },
        { value: LogLevel.INFO, title: 'INFO' },
        { value: LogLevel.DEBUG, title: 'DEBUG' },
        { value: LogLevel.TRACE, title: 'TRACE' },
      ],
      dynamicTitle: true,
    },
  },
};
