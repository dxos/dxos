//
// Copyright 2023 DXOS.org
//

import { addons } from '@storybook/preview-api';
import { type Decorator } from '@storybook/react';
import React, { useEffect, useState } from 'react';
import { DARK_MODE_EVENT_NAME } from 'storybook-dark-mode';

import { log } from '@dxos/log';
import { type ThemeMode, ThemeProvider } from '@dxos/react-ui';
import { defaultTx } from '@dxos/react-ui-theme';

const channel = addons.getChannel();

/**
 * Changes theme based on storybook toolbar toggle.
 */
export const withTheme: Decorator = (Story, context) => {
  const [themeMode, setThemeMode] = useState<ThemeMode>('dark');
  log.info('withTheme', { themeMode });

  // https://www.npmjs.com/package/storybook-dark-mode
  // NOTE: The useDarkMode hook causes the story to re-render infinitely.
  useEffect(() => {
    const handleUpdate = (dark: boolean) => setThemeMode(dark ? 'dark' : 'light');
    channel.on(DARK_MODE_EVENT_NAME, handleUpdate);
    return () => channel.off(DARK_MODE_EVENT_NAME, handleUpdate);
  }, [channel]);

  return (
    <ThemeProvider tx={defaultTx} themeMode={themeMode} resourceExtensions={context?.parameters?.translations}>
      <Story />
    </ThemeProvider>
  );
};
