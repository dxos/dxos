//
// Copyright 2023 DXOS.org
//

import { addons } from '@storybook/preview-api';
import { type Decorator } from '@storybook/react';
import React, { memo, useEffect, useState } from 'react';
import { DARK_MODE_EVENT_NAME } from 'storybook-dark-mode';

import { type ThemeMode, ThemeProvider, Tooltip } from '@dxos/react-ui';
import { defaultTx } from '@dxos/react-ui-theme';

const channel = addons.getChannel();

/**
 * Changes theme based on storybook toolbar toggle.
 */
export const withTheme: Decorator = (Story, context) => {
  // Prevent re-rendering of the story.
  const MemoizedStory = memo(Story);
  const [themeMode, setThemeMode] = useState<ThemeMode>('dark');

  // https://www.npmjs.com/package/storybook-dark-mode
  // NOTE: The `useDarkMode` hook causes the story to continually re-render.
  // NOTE: Changing the theme will cause the story to remount.
  useEffect(() => {
    const handleUpdate = (darkMode: boolean) => setThemeMode(darkMode ? 'dark' : 'light');
    channel.on(DARK_MODE_EVENT_NAME, handleUpdate);
    return () => channel.off(DARK_MODE_EVENT_NAME, handleUpdate);
  }, [channel]);

  return (
    <ThemeProvider tx={defaultTx} themeMode={themeMode} resourceExtensions={context?.parameters?.translations} noCache>
      <Tooltip.Provider>
        <MemoizedStory />
      </Tooltip.Provider>
    </ThemeProvider>
  );
};
