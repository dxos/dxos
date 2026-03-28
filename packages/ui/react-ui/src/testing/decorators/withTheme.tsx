//
// Copyright 2023 DXOS.org
//

import { type Decorator } from '@storybook/react';
import React from 'react';

import { defaultTx } from '@dxos/ui-theme';
import { type ThemeMode } from '@dxos/ui-types';

import { type ThemeContextValue, ThemeProvider, Tooltip } from '../../components';

/**
 * Adds theme decorator.
 */
export const withTheme =
  ({ tx = defaultTx, noCache, platform }: Partial<ThemeContextValue> = {}): Decorator =>
  (Story, context) => {
    const {
      globals: { theme },
      parameters: { translations },
    } = context;

    return (
      <ThemeProvider tx={tx} themeMode={theme as ThemeMode} resourceExtensions={translations} noCache={noCache} platform={platform}>
        <Tooltip.Provider>
          <Story />
        </Tooltip.Provider>
      </ThemeProvider>
    );
  };
