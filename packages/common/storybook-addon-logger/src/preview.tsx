//
// Copyright 2025 DXOS.org
//

import { type Preview } from '@storybook/react';
import React, { memo, useEffect } from 'react';

import { log, LogLevel } from '@dxos/log';

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
        log.config({ filter: logLevel });
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
          { value: LogLevel.TRACE, title: 'TRACE' },
          { value: LogLevel.DEBUG, title: 'DEBUG' },
          { value: LogLevel.INFO, title: 'INFO' },
          { value: LogLevel.WARN, title: 'WARN' },
          { value: LogLevel.ERROR, title: 'ERROR' },
        ],
      },
    },
  },
};

export default preview;
