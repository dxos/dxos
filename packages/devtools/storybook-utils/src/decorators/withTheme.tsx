//
// Copyright 2023 DXOS.org
//

import { type Decorator } from '@storybook/react';
import React, { memo } from 'react';

import { type ThemeMode, ThemeProvider, Tooltip } from '@dxos/react-ui';
import { defaultTx } from '@dxos/react-ui-theme';

/**
 * Changes theme based on storybook toolbar toggle.
 * NOTE: The "dark" class is added to the root element to enable tailwindcss dark mode.
 * This is either added by the app's HTML or the global storybook decorator.
 */
export const withTheme: Decorator = (Story, context) => {
  // Prevent re-rendering of the story.
  const MemoizedStory = memo(Story);
  const themeMode = context.globals.theme as ThemeMode;

  return (
    <ThemeProvider tx={defaultTx} themeMode={themeMode} resourceExtensions={context?.parameters?.translations} noCache>
      <Tooltip.Provider>
        <MemoizedStory />
      </Tooltip.Provider>
    </ThemeProvider>
  );
};
