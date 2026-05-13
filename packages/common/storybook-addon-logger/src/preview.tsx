//
// Copyright 2025 DXOS.org
//

import { type Preview } from '@storybook/react';
import React, { memo, useEffect } from 'react';
import { STORY_CHANGED } from 'storybook/internal/core-events';
import { addons } from 'storybook/preview-api';

import { LogBuffer, LogLevel, log } from '@dxos/log';

import { DOWNLOAD_EVENT, LOGS_DATA_EVENT } from './constants';

/** Default DX log level for Storybook preview (matches toolbar item values). */
const DEFAULT_LOG_LEVEL = String(LogLevel.INFO);

const logBuffer = new LogBuffer();
log.addProcessor(logBuffer.logProcessor);
log.config({ filter: Number(DEFAULT_LOG_LEVEL) });

const channel = addons.getChannel();
channel.on(DOWNLOAD_EVENT, () => {
  channel.emit(LOGS_DATA_EVENT, { ndjson: logBuffer.serialize() });
});
channel.on(STORY_CHANGED, () => {
  logBuffer.clear();
});

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
        const parsed = Number(logLevel);
        const level = Number.isFinite(parsed) ? parsed : Number(DEFAULT_LOG_LEVEL);
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
      defaultValue: DEFAULT_LOG_LEVEL,
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
