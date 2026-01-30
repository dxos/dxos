//
// Copyright 2025 DXOS.org
//

import { type Preview } from '@storybook/react';
import React, { memo, useEffect } from 'react';

import { LogLevel, log } from '@dxos/log';

// TODO(burdon): Create separate addon for global types.
const preview: Preview = {
  /**
   * Global decorators.
   * https://storybook.js.org/docs/writing-stories/decorators
   */
  decorators: [
    (Story, { globals: { logLevel } }) => {
      // Prevent re-rendering of the story.
      const MemoizedStory = memo(Story);
      useEffect(() => {
        const level = Number(logLevel);
        log.config({ filter: level });
      }, [logLevel]);

      return <MemoizedStory />;
    },
  ],

  /**
   * These definitions add controls to the toolbar.
   * https://storybook.js.org/docs/essentials/toolbars-and-globals
   */
  globalTypes: {
    logLevel: {
      name: 'Log level',
      description: 'DX logging level.',
      defaultValue: 'INFO',
      toolbar: {
        title: 'Log level',
        icon: 'eye',
        dynamicTitle: true,
        items: [
          {
            value: String(LogLevel.TRACE),
            title: 'TRACE',
          },
          {
            value: String(LogLevel.DEBUG),
            title: 'DEBUG',
          },
          {
            value: String(LogLevel.INFO),
            title: 'INFO',
          },
          {
            value: String(LogLevel.WARN),
            title: 'WARN',
          },
          {
            value: String(LogLevel.ERROR),
            title: 'ERROR',
          },
        ],
      },
    },
  },
};

export default preview;
