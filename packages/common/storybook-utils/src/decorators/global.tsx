//
// Copyright 2025 DXOS.org
//

import { Decorator, type Preview } from '@storybook/react';
import React, { memo, useEffect } from 'react';

import { log, LogLevel } from '@dxos/log';

/**
 * Global decorators.
 * https://storybook.js.org/docs/writing-stories/decorators
 */
export const withLogger: Decorator = (Story, { globals: { logLevel } }) => {
  // Prevent re-rendering of the story.
  const MemoizedStory = memo(Story);

  useEffect(() => {
    log.config({ filter: logLevel });
  }, [logLevel]);

  return <MemoizedStory />;
};

export const decorators: Preview['decorators'] = [
  withLogger,
];

/**
 * These definitions add controls to the toolbar.
 * https://storybook.js.org/docs/essentials/toolbars-and-globals
 */
export const globalTypes: Preview['globalTypes'] = {
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
