//
// Copyright 2023 DXOS.org
//

import { type Decorator } from '@storybook/react';
import React, { memo } from 'react';

import { type ThemeMode, ThemeProvider, Tooltip } from '@dxos/react-ui';
import { defaultTx } from '@dxos/react-ui-theme';

/**
 * Adds theme decorator (add to preview.ts)
 */
export const withTheme: Decorator = (Story, context) => {
  const {
    globals: { theme },
    parameters: { translations },
  } = context;

  // Prevent re-rendering of the story.
  const MemoizedStory = memo(Story);

  return (
    <ThemeProvider tx={defaultTx} themeMode={theme as ThemeMode} resourceExtensions={translations} noCache>
      <Tooltip.Provider>
        <MemoizedStory />
      </Tooltip.Provider>
    </ThemeProvider>
  );
};
